import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from './utils/rate-limit.js';
import { runPromptTheme, streamPromptTheme } from '../utils/promptThemeHandler.js';

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

  if (req.body && typeof req.body === 'object' && req.body.stream === true) {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.status(200);
    await streamPromptTheme(req.body, (line) => res.write(line));
    res.end();
    return;
  }

  const { status, payload } = await runPromptTheme(req.body);
  return res.status(status).json(payload);
}
