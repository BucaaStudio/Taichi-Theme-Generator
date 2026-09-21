import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from './utils/rate-limit.js';
import { interpretThemePrompt } from '../utils/interpretThemePrompt.js';
import {
  PromptThemeError,
  AI_PHILOSOPHY,
  buildThemeFromIntent,
  normalizeThemeRequest,
} from '../utils/promptTheme.js';

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
    });
  }

  // Image requests cost far more tokens, so they get a tighter budget.
  const hasImage = Boolean(req.body && typeof req.body === 'object' && req.body.image);
  const rateLimitResult = await rateLimit(req, hasImage ? 4 : 8, 60000);
  if (!rateLimitResult.success) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter,
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const parsed = normalizeThemeRequest(body);
    if ('error' in parsed) {
      return res.status(400).json({
        success: false,
        error: parsed.error,
        code: parsed.code,
      });
    }

    const intent = await interpretThemePrompt(parsed.prompt, parsed.image);
    const result = buildThemeFromIntent(intent);

    return res.status(200).json({
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
        philosophy: AI_PHILOSOPHY,
        prompt: parsed.prompt,
        rationale: intent.rationale,
        options: intent.options,
      },
    });
  } catch (error) {
    const mapped = error instanceof PromptThemeError
      ? error
      : new PromptThemeError('Could not generate a theme from that prompt.', 'AI_FAILED', 502);
    console.error('Error prompting theme:', mapped);
    return res.status(mapped.status).json({
      success: false,
      error: mapped.message,
      code: mapped.code,
    });
  }
}
