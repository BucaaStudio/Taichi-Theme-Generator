import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getRateLimitStatus } from './utils/rate-limit';

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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Apply rate limiting (20 requests per minute per IP)
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
    // Parse query parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = parseInt(req.query.offset as string) || 0;

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
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching theme history',
      code: 'INTERNAL_ERROR'
    });
  }
}
