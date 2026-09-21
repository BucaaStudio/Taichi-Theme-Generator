import fs from 'node:fs';
import path from 'node:path';
import {
  PromptThemeError,
  clampThemePromptIntent,
  themePromptIntentSchema,
  type ThemePromptImage,
  type ThemePromptIntent,
} from './promptTheme.js';

function ensureGatewayEnv() {
  let gatewayKey = '';
  let oidcToken = '';
  try {
    const text = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const index = trimmed.indexOf('=');
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'AI_GATEWAY_API_KEY') gatewayKey = value;
      if (key === 'VERCEL_OIDC_TOKEN') oidcToken = value;
    }
  } catch {
    // Production uses Vercel OIDC; local uses .env.local when present.
  }
  if (gatewayKey) process.env.AI_GATEWAY_API_KEY = gatewayKey;
  else delete process.env.AI_GATEWAY_API_KEY;
  if (oidcToken) process.env.VERCEL_OIDC_TOKEN = oidcToken;
}

const INTERPRET_INSTRUCTIONS = `You are a senior UI color designer. Design a complete light and dark UI theme from the user's description. You choose every color; nothing is derived for you except button label colors.

Return #rrggbb for each token, for BOTH light and dark:
- bg: page background. card: raised panels on bg. card2: nested surface inside card. border: hairlines around cards and inputs.
- text: body text on bg and card. textMuted: secondary text.
- primary: main brand color (primary buttons, links, headings). secondary and accent: the second and third brand colors (buttons, badges, highlights).
- good / warn / bad: success, warning, error status colors.

Be faithful to the subject. First decide which colors the subject really has and which it must NOT have, then use only those: chinese new year is red and gold on warm cream or deep maroon-black, never pink or purple; lego is red, yellow and blue on clean neutral white or charcoal; ocean is blues and teal on pale aqua or deep navy. If the subject has fewer than three colors, use shades of them rather than inventing a hue. Backgrounds are yours too — tint them, warm them, or keep them neutral, whatever suits the subject. Dark mode is the same identity at night, not a different palette.

Keep it a usable UI:
- text on bg and on card at least 7:1 contrast; textMuted at least 4.5:1.
- primary, secondary, accent, good, warn, bad must each stand out from bg and card (3:1 or better) and work as a button fill.
- bg, card, card2 and border must be visibly distinct steps of one surface family. Light bg is light, dark bg is dark.
- good reads as success, warn as caution, bad as error, and bad should differ from primary when primary is red.

options — you also set every design control so the whole look matches the subject:
- borderWidth: 0 none, 1 thin, 2 thick. radius: 0 sharp … 5 very round. shadowStrength: 0 flat … 5 deep. shadowOpacity: 0-100 percent (flat/brutalist ≈ 0-10, soft modern ≈ 15-25, dramatic ≈ 35+).
  Playful or toy-like → round, thick borders. Editorial, paper, brutalist → sharp, flat. Neon/glass/dashboard → medium radius, stronger shadows.
- gradients: true when glossy, neon, sunset or playful suits it; false for flat, paper, minimal.
- darkFirst: true when the subject is dark-led (midnight, neon, space, cinema); the app then opens in dark mode.
- saturation, contrast, brightness (-5 … 5): DESCRIBE the colors you chose — vivid palette → saturation +2..+4, muted/pastel → -1..-3, punchy → contrast +2..+3, airy → brightness +1..+3, dim → negative. These position the sliders; they do not change your colors.

If an image is attached, it is the source of truth. Take the palette from what is actually in it — its dominant surfaces become bg/card, its most characteristic color becomes primary, supporting colors become secondary and accent — and match its mood in the options. Do not invent hues the image does not contain (status colors excepted). Any text alongside it is a steer ("calmer", "make the blue primary"), not a replacement.

rationale: one short clause naming the colors, no marketing fluff.`;

export async function interpretThemePrompt(
  prompt: string,
  image?: ThemePromptImage | URL | null
): Promise<ThemePromptIntent> {
  ensureGatewayEnv();
  // Loaded on demand: the SDK is ESM-only, and importers like the MCP server
  // should not pay for (or break on) it until a prompt is actually run.
  const { generateText, Output, gateway, APICallError } = await import('ai');
  try {
    const { output } = await generateText({
      model: gateway('google/gemini-3.8-flash'),
      instructions: INTERPRET_INSTRUCTIONS,
      output: Output.object({
        schema: themePromptIntentSchema,
        name: 'ThemePromptIntent',
        description: 'Complete light and dark UI color tokens.',
      }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || 'Design a theme from this image.' },
            ...(image
              ? [
                  image instanceof URL
                    ? ({ type: 'image', image } as const)
                    : ({ type: 'image', image: image.data, mediaType: image.mediaType } as const),
                ]
              : []),
          ],
        },
      ],
      timeout: { totalMs: image ? 40000 : 20000 },
      providerOptions: {
        gateway: {
          models: ['openai/gpt-5.4-mini', 'anthropic/claude-haiku-4.5'],
          tags: ['feature:prompt-theme'],
        },
      },
    });

    if (!output) {
      throw new Error('The model did not return a theme.');
    }
    return clampThemePromptIntent(output);
  } catch (error) {
    throw toPromptThemeError(error, APICallError.isInstance(error) ? error.statusCode : undefined);
  }
}

function toPromptThemeError(error: unknown, statusCode?: number): PromptThemeError {
  if (error instanceof PromptThemeError) return error;
  const message = error instanceof Error ? error.message : 'Could not interpret that prompt.';
  if (/credit card|payment method|unlock your free credits/i.test(message)) {
    return new PromptThemeError(
      'AI Gateway needs a payment method on the Vercel team to unlock credits.',
      'AI_BILLING',
      402
    );
  }
  if (statusCode !== undefined) {
    if (statusCode === 402) {
      return new PromptThemeError('AI budget is exhausted. Try again later.', 'AI_BUDGET', 402);
    }
    if (statusCode === 429) {
      return new PromptThemeError('Too many AI requests. Slow down and retry.', 'AI_RATE_LIMIT', 429);
    }
    if (statusCode === 401 || statusCode === 403) {
      return new PromptThemeError(
        'AI theme prompts need Vercel AI Gateway auth. Link this project and run vercel env pull.',
        'AI_AUTH',
        503
      );
    }
  }
  if (/oidc token|invalid api key|unauthorized|forbidden/i.test(message)) {
    return new PromptThemeError(
      'AI theme prompts need Vercel AI Gateway auth. Link this project and run vercel env pull.',
      'AI_AUTH',
      503
    );
  }
  return new PromptThemeError(message, 'AI_FAILED', 502);
}
