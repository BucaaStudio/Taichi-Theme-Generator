import path from 'path';
import fs from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function applyGatewayEnv() {
  let gatewayKey = '';
  let oidcToken = '';
  try {
    const text = fs.readFileSync(new URL('./.env.local', import.meta.url), 'utf8');
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
    // Local AI auth is optional until .env.local exists.
  }
  if (gatewayKey) process.env.AI_GATEWAY_API_KEY = gatewayKey;
  else delete process.env.AI_GATEWAY_API_KEY;
  if (oidcToken) process.env.VERCEL_OIDC_TOKEN = oidcToken;
}

const appVersion = (() => {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')
    );
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    applyGatewayEnv();
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'prompt-theme-api',
          configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
              const url = req.url?.split('?')[0];
              if (url !== '/api/prompt-theme') {
                next();
                return;
              }
              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.', code: 'METHOD_NOT_ALLOWED' }));
                return;
              }
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              let body: { prompt?: unknown; image?: unknown } = {};
              try {
                body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON body.', code: 'INVALID_JSON' }));
                return;
              }
              try {
                applyGatewayEnv();
                const promptTheme = await server.ssrLoadModule('/utils/promptTheme.ts');
                const interpret = await server.ssrLoadModule('/utils/interpretThemePrompt.ts');
                const parsed = promptTheme.normalizeThemeRequest(body);
                if (parsed.error) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: parsed.error, code: parsed.code }));
                  return;
                }
                const intent = await interpret.interpretThemePrompt(parsed.prompt, parsed.image);
                const result = promptTheme.buildThemeFromIntent(intent);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  light: result.light,
                  dark: result.dark,
                  intent,
                  metadata: {
                    mode: result.mode,
                    style: result.mode,
                    seed: result.seed,
                    timestamp: Date.now(),
                    colorSpace: 'OKLCH',
                    philosophy: promptTheme.AI_PHILOSOPHY,
                    prompt: parsed.prompt,
                    rationale: intent.rationale,
                    options: intent.options,
                  },
                }));
              } catch (error) {
                const status = error?.status ?? 502;
                res.statusCode = typeof status === 'number' ? status : 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Could not generate a theme from that prompt.',
                  code: error?.code ?? 'AI_FAILED',
                }));
              }
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __APP_VERSION__: JSON.stringify(appVersion)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
