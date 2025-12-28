import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Simple in-memory analytics store
 * Note: Resets on cold starts as serverless functions are stateless
 */
const analyticsStore = {
  requests: 0,
  endpoints: {} as Record<string, number>,
  styles: {} as Record<string, number>,
  formats: {} as Record<string, number>,
  errors: {} as Record<string, number>,
  startTime: Date.now(),
};

// Export for other endpoints to increment (within same instance)
export function logEvent(
  endpoint: string, 
  options?: { style?: string; format?: string; error?: string }
) {
  analyticsStore.requests++;
  analyticsStore.endpoints[endpoint] = (analyticsStore.endpoints[endpoint] || 0) + 1;
  
  if (options?.style) {
    analyticsStore.styles[options.style] = (analyticsStore.styles[options.style] || 0) + 1;
  }
  if (options?.format) {
    analyticsStore.formats[options.format] = (analyticsStore.formats[options.format] || 0) + 1;
  }
  if (options?.error) {
    analyticsStore.errors[options.error] = (analyticsStore.errors[options.error] || 0) + 1;
  }
  
  // Log to Vercel's console (captured in logs)
  console.log(JSON.stringify({
    type: 'api_analytics',
    endpoint,
    ...options,
    timestamp: Date.now(),
  }));
}

/**
 * API Endpoint: Analytics
 * 
 * Returns usage statistics for the API.
 * Note: Stats are per-instance and reset on cold starts.
 * 
 * Endpoint: GET /api/analytics
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

  try {
    const uptime = Math.floor((Date.now() - analyticsStore.startTime) / 1000);
    
    return res.status(200).json({
      success: true,
      analytics: {
        totalRequests: analyticsStore.requests,
        uptimeSeconds: uptime,
        requestsPerMinute: uptime > 0 ? (analyticsStore.requests / (uptime / 60)).toFixed(2) : '0',
        endpoints: analyticsStore.endpoints,
        styles: analyticsStore.styles,
        formats: analyticsStore.formats,
        errors: analyticsStore.errors,
        instanceStartTime: new Date(analyticsStore.startTime).toISOString(),
      },
      note: 'Stats are per-instance and reset on cold starts. Check Vercel logs for complete analytics.'
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error while fetching analytics',
      code: 'INTERNAL_ERROR'
    });
  }
}
