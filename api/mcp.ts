import type { VercelRequest, VercelResponse } from '@vercel/node';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { generateTheme } from '../utils/colorUtils.js';
import type { GenerationMode } from '../types.js';
import { rateLimit } from './utils/rate-limit.js';
import { buildThemeExport, VALID_EXPORT_FORMATS } from './utils/theme-export.js';
import { interpretThemePrompt } from '../utils/interpretThemePrompt.js';
import { buildThemeFromIntent, normalizeThemeRequest, type ThemePromptImage } from '../utils/promptTheme.js';

/**
 * MCP Endpoint: /api/mcp
 *
 * Streamable HTTP MCP server (stateless mode) exposing the theme generator
 * to AI agents. Each POST carries a self-contained JSON-RPC message; no
 * session state is kept between requests.
 *
 * Tools: generate_theme, export_theme
 * Rate Limit: 30 requests per minute per IP
 */

const STYLES = [
  'random', 'monochrome', 'analogous', 'complementary', 'split-complementary',
  'triadic', 'tetradic', 'compound', 'triadic-split',
] as const;

const level = z.number().min(-5).max(5);
const themeRecord = z.record(z.string(), z.string());

function buildServer(): McpServer {
  const server = new McpServer(
    { name: 'taichi-theme-generator', version: '1.0.0' },
    {
      instructions:
        'Generates accessible OKLCH-based light/dark UI color themes. ' +
        'Call generate_theme for explicit knobs, generate_theme_from_prompt for a mood like "spring morning", ' +
        'then export_theme to render it as CSS, SCSS, LESS, Tailwind config, or JSON.',
    }
  );

  server.registerTool(
    'generate_theme',
    {
      title: 'Generate theme',
      description:
        'Generate a dual (light + dark) UI color theme of 20 design tokens using OKLCH color harmony. ' +
        'Optionally seed with a base hex color and adjust saturation/contrast/brightness (-5 to 5).',
      inputSchema: {
        style: z.enum(STYLES).default('random')
          .describe('Color harmony style'),
        baseColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
          .describe('Optional seed hex color, e.g. #3B82F6. Omit for a random seed.'),
        saturationLevel: level.default(0).describe('Saturation adjustment, -5 to 5'),
        contrastLevel: level.default(0).describe('Contrast adjustment, -5 to 5'),
        brightnessLevel: level.default(0).describe('Brightness adjustment, -5 to 5'),
        darkFirst: z.boolean().default(false)
          .describe('Generate the dark palette first and derive light from it'),
        splitAdjustments: z.boolean().default(false)
          .describe('Use independent adjustment levels for light and dark modes'),
        lightSaturationLevel: level.optional().describe('Light-mode saturation (requires splitAdjustments)'),
        lightContrastLevel: level.optional().describe('Light-mode contrast (requires splitAdjustments)'),
        lightBrightnessLevel: level.optional().describe('Light-mode brightness (requires splitAdjustments)'),
        darkSaturationLevel: level.optional().describe('Dark-mode saturation (requires splitAdjustments)'),
        darkContrastLevel: level.optional().describe('Dark-mode contrast (requires splitAdjustments)'),
        darkBrightnessLevel: level.optional().describe('Dark-mode brightness (requires splitAdjustments)'),
      },
      outputSchema: {
        light: themeRecord.describe('Light-mode tokens (hex colors)'),
        dark: themeRecord.describe('Dark-mode tokens (hex colors)'),
        seed: z.string().describe('Seed color used for generation'),
        style: z.string().describe('Resolved harmony style'),
      },
    },
    async (args) => {
      const {
        style, baseColor, saturationLevel, contrastLevel, brightnessLevel,
        darkFirst, splitAdjustments,
      } = args;

      const lightSat = splitAdjustments ? (args.lightSaturationLevel ?? saturationLevel) : saturationLevel;
      const lightCon = splitAdjustments ? (args.lightContrastLevel ?? contrastLevel) : contrastLevel;
      const lightBri = splitAdjustments ? (args.lightBrightnessLevel ?? brightnessLevel) : brightnessLevel;
      const darkSat = splitAdjustments ? (args.darkSaturationLevel ?? saturationLevel) : saturationLevel;
      const darkCon = splitAdjustments ? (args.darkContrastLevel ?? contrastLevel) : contrastLevel;
      const darkBri = splitAdjustments ? (args.darkBrightnessLevel ?? brightnessLevel) : brightnessLevel;

      const result = generateTheme(
        style as GenerationMode,
        baseColor,
        lightSat,
        lightCon,
        lightBri,
        undefined,
        darkFirst,
        darkSat,
        darkCon,
        darkBri
      );

      const structured = {
        light: result.light as unknown as Record<string, string>,
        dark: result.dark as unknown as Record<string, string>,
        seed: result.seed,
        style: result.mode,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    'generate_theme_from_prompt',
    {
      title: 'Generate theme from prompt',
      description:
        'Interpret a natural-language mood (e.g. "a bright colorful theme that feels like spring") ' +
        'and/or an image into a complete dual light/dark theme. The AI chooses every color token. ' +
        'Provide prompt, an image, or both; with both, the image sets the palette and the prompt steers it.',
      inputSchema: {
        prompt: z.string().max(400).optional().describe('Theme mood or description'),
        imageUrl: z.string().url().optional().describe('Public https URL of an image to take the palette from'),
        imageDataUrl: z.string().optional().describe('Image as a base64 data URL (JPEG, PNG, WebP or GIF, under 1.5 MB)'),
      },
      outputSchema: {
        light: themeRecord.describe('Light-mode tokens (hex colors)'),
        dark: themeRecord.describe('Dark-mode tokens (hex colors)'),
        seed: z.string(),
        style: z.string(),
        rationale: z.string(),
        options: z.record(z.string(), z.union([z.number(), z.boolean()])).describe('Design controls chosen by the AI: borders, radius, shadows, gradients, darkFirst, slider levels'),
      },
    },
    async ({ prompt, imageUrl, imageDataUrl }) => {
      let image: ThemePromptImage | URL | null = null;
      if (imageUrl) {
        const url = new URL(imageUrl);
        if (url.protocol !== 'https:') throw new Error('imageUrl must be an https URL.');
        image = url;
      }
      const parsed = normalizeThemeRequest({ prompt, image: image ? undefined : imageDataUrl });
      if ('error' in parsed) {
        if (!image) throw new Error(parsed.error);
      } else {
        image = image ?? parsed.image;
      }
      const intent = await interpretThemePrompt('error' in parsed ? '' : parsed.prompt, image);
      const result = buildThemeFromIntent(intent);
      const structured = {
        light: result.light as unknown as Record<string, string>,
        dark: result.dark as unknown as Record<string, string>,
        seed: result.seed,
        style: result.mode,
        rationale: intent.rationale,
        options: intent.options as Record<string, number | boolean>,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
        structuredContent: structured,
      };
    }
  );

  server.registerTool(
    'export_theme',
    {
      title: 'Export theme',
      description:
        'Export a theme (a flat map of token names to hex colors, e.g. one side of a generate_theme result) ' +
        'as CSS custom properties, SCSS/LESS variables, a Tailwind config, or JSON.',
      inputSchema: {
        theme: themeRecord.describe('Token → hex color map, e.g. the light or dark object from generate_theme'),
        format: z.enum(VALID_EXPORT_FORMATS).default('css').describe('Output format'),
        prefix: z.string().default('taichi').describe('Variable name prefix'),
        includeComments: z.boolean().default(true).describe('Include header/usage comments'),
      },
      outputSchema: {
        content: z.string().describe('Exported file content'),
        filename: z.string().describe('Suggested filename'),
        format: z.string(),
      },
    },
    async ({ theme, format, prefix, includeComments }) => {
      const { content, filename } = buildThemeExport(theme, format, prefix, includeComments);
      const structured = { content, filename, format };
      return {
        content: [{ type: 'text', text: content }],
        structuredContent: structured,
      };
    }
  );

  return server;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (mirrors the REST endpoints; MCP adds its own headers)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. This MCP endpoint is stateless; use POST.' },
      id: null,
    });
    return;
  }

  const rateLimitResult = await rateLimit(req, 30, 60000);
  if (!rateLimitResult.success) {
    res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfter}s.`,
      },
      id: null,
    });
    return;
  }

  // The transport requires Accept to list both content types; be lenient with
  // plain JSON clients since stateless mode always answers with JSON anyway.
  // The SDK reads headers from rawHeaders (via Hono's request listener), so
  // patch both views of the header.
  const accept = req.headers.accept ?? '';
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    const normalized = 'application/json, text/event-stream';
    req.headers.accept = normalized;
    const rawIndex = req.rawHeaders.findIndex((h, i) => i % 2 === 0 && h.toLowerCase() === 'accept');
    if (rawIndex >= 0) {
      req.rawHeaders[rawIndex + 1] = normalized;
    } else {
      req.rawHeaders.push('Accept', normalized);
    }
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
}
