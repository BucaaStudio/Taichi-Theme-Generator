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
 * Query Parameters:
 * - limit: number (optional, default: 10, max: 50) - Number of themes to retrieve
 * - offset: number (optional, default: 0) - Pagination offset
 * 
 * Response (JSON):
 * {
 *   "success": true,
 *   "themes": [
 *     {
 *       "id": string,
 *       "theme": { ... },
 *       "metadata": { ... },
 *       "createdAt": number
 *     }
 *   ],
 *   "pagination": {
 *     "limit": number,
 *     "offset": number,
 *     "total": number
 *   }
 * }
 * 
 * Note: This is a placeholder implementation. In production, you would:
 * 1. Store themes in a database (e.g., Vercel KV, PostgreSQL)
 * 2. Associate themes with user sessions or accounts
 * 3. Implement proper pagination
import { logAnalyticsEvent, maskIP } from './utils/analytics';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
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

  // Only allow GET requests
  if (req.method !== 'GET') {
    logAnalyticsEvent({
      endpoint: '/api/theme-history',
      method: req.method || 'UNKNOWN',
      status: 405,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      error: 'METHOD_NOT_ALLOWED',
      timestamp: Date.now(),
    });
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Apply rate limiting (20 requests per minute per IP)
  const rateLimitResult = await rateLimit(req, 20, 60000);
  if (!rateLimitResult.success) {
    logAnalyticsEvent({
      endpoint: '/api/theme-history',
      method: 'GET',
      status: 429,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      error: 'RATE_LIMIT_EXCEEDED',
      timestamp: Date.now(),
    });
    
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
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    // Log successful request
    logAnalyticsEvent({
      endpoint: '/api/theme-history',
      method: 'GET',
      status: 200,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      timestamp: Date.now(),
    });

    // Placeholder response - in production, fetch from database
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
    
    logAnalyticsEvent({
      endpoint: '/api/theme-history',
      method: 'GET',
      status: 500,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      error: 'INTERNAL_ERROR',
      timestamp: Date.now(),
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching theme history',
      code: 'INTERNAL_ERROR'
    });
  }
}

