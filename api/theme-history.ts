import type { VercelRequest, VercelResponse } from '@vercel/node';

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

function getRateLimitStatus(req: VercelRequest, max: number) {
  const ip = getClientIP(req);
  const entry = rateLimitStore.get(ip);
  const now = Date.now();
  if (!entry || now > entry.resetTime) {
    return { remaining: max, resetTime: now + 60000, total: max };
  }
  return { remaining: Math.max(0, max - entry.count), resetTime: entry.resetTime, total: max };
}

/**
 * API Endpoint: Get Theme History
 * 
 * Retrieves previously generated themes for a user session.
 * 
 * Rate Limit: 20 requests per minute per IP
 * 
 * Note: This is a placeholder implementation. In production, themes would be
 * stored in a database (e.g., Vercel KV, PostgreSQL).
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const rateLimitResult = await rateLimit(req, 20, 60000);
  if (!rateLimitResult.success) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  // Add rate limit headers
  const status = getRateLimitStatus(req, 20);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', status.remaining.toString());
  res.setHeader('X-RateLimit-Reset', status.resetTime.toString());

  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    // Placeholder response
    return res.status(200).json({
      success: true,
      themes: [],
      pagination: {
        limit,
        offset,
        total: 0
      },
      message: 'Theme history feature coming soon. Themes are currently stored locally in your browser.'
    });

  } catch (error) {
    console.error('Error fetching theme history:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching theme history',
      code: 'INTERNAL_ERROR'
    });
  }
}
