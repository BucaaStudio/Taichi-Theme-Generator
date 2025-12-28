import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAnalyticsSummary, logAnalyticsEvent } from './utils/analytics';

/**
 * API Endpoint: Analytics
 * 
 * Returns usage statistics for the API.
 * Note: Stats are per-instance and reset on cold starts.
 * For persistent analytics, check Vercel dashboard logs.
 * 
 * Endpoint: GET /api/analytics
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  
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
    logAnalyticsEvent({
      endpoint: '/api/analytics',
      method: req.method || 'UNKNOWN',
      status: 405,
      duration: Date.now() - startTime,
      error: 'METHOD_NOT_ALLOWED',
      timestamp: Date.now(),
    });
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const summary = getAnalyticsSummary();
    
    logAnalyticsEvent({
      endpoint: '/api/analytics',
      method: 'GET',
      status: 200,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    });
    
    return res.status(200).json({
      success: true,
      analytics: summary,
      note: 'Stats are per-instance and reset on cold starts. Check Vercel logs for complete analytics.'
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    logAnalyticsEvent({
      endpoint: '/api/analytics',
      method: 'GET',
      status: 500,
      duration: Date.now() - startTime,
      error: 'INTERNAL_ERROR',
      timestamp: Date.now(),
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching analytics',
      code: 'INTERNAL_ERROR'
    });
  }
}
