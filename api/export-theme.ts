import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildThemeExport, VALID_EXPORT_FORMATS, type ExportFormat } from './utils/theme-export.js';

// Inline rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return 'unknown';
}

async function rateLimit(req: VercelRequest, max: number, windowMs: number) {
  const ip = getClientIP(req);
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }
  if (entry.count < max) {
    entry.count++;
    return { success: true };
  }
  return { success: false, retryAfter: Math.ceil((entry.resetTime - now) / 1000) };
}

/**
 * API Endpoint: Export Theme
 *
 * Exports a theme in various formats (CSS, JSON, Tailwind config, etc.)
 *
 * Rate Limit: 15 requests per minute per IP
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const rateLimitResult = await rateLimit(req, 15, 60000);
  if (!rateLimitResult.success) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    const { theme, format = 'css', options = {} } = req.body || {};

    if (!theme || typeof theme !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid theme object',
        code: 'INVALID_THEME'
      });
    }

    if (!VALID_EXPORT_FORMATS.includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Must be one of: ${VALID_EXPORT_FORMATS.join(', ')}`,
        code: 'INVALID_FORMAT'
      });
    }

    const prefix = options.prefix || 'taichi';
    const includeComments = options.includeComments !== false;

    const { content, filename } = buildThemeExport(theme, format as ExportFormat, prefix, includeComments);

    return res.status(200).json({
      success: true,
      format,
      content,
      filename
    });

  } catch (error) {
    console.error('Error exporting theme:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while exporting theme',
      code: 'INTERNAL_ERROR'
    });
  }
}
