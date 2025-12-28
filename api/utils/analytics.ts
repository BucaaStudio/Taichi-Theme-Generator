/**
 * API Analytics Utility
 * 
 * Simple in-memory analytics for serverless functions.
 * Note: Data resets on cold starts, but Vercel logs capture all events.
 */

// In-memory analytics store (resets on cold starts)
export const analyticsStore = {
  requests: 0,
  endpoints: new Map<string, number>(),
  styles: new Map<string, number>(),
  formats: new Map<string, number>(),
  errors: new Map<string, number>(),
  startTime: Date.now(),
};

export interface AnalyticsEvent {
  endpoint: string;
  method: string;
  status: number;
  duration: number;
  ip?: string;
  userAgent?: string;
  style?: string;
  format?: string;
  error?: string;
  timestamp: number;
}

/**
 * Log an analytics event to console (Vercel captures these)
 * and update in-memory counters
 */
export function logAnalyticsEvent(event: AnalyticsEvent): void {
  // Update in-memory counters
  analyticsStore.requests++;
  
  const endpointCount = analyticsStore.endpoints.get(event.endpoint) || 0;
  analyticsStore.endpoints.set(event.endpoint, endpointCount + 1);
  
  if (event.style) {
    const styleCount = analyticsStore.styles.get(event.style) || 0;
    analyticsStore.styles.set(event.style, styleCount + 1);
  }
  
  if (event.format) {
    const formatCount = analyticsStore.formats.get(event.format) || 0;
    analyticsStore.formats.set(event.format, formatCount + 1);
  }
  
  if (event.error) {
    const errorCount = analyticsStore.errors.get(event.error) || 0;
    analyticsStore.errors.set(event.error, errorCount + 1);
  }
  
  // Log structured event for Vercel logs
  console.log(JSON.stringify({
    type: 'api_analytics',
    ...event,
  }));
}

/**
 * Get analytics summary
 */
export function getAnalyticsSummary() {
  const uptime = Math.floor((Date.now() - analyticsStore.startTime) / 1000);
  
  return {
    totalRequests: analyticsStore.requests,
    uptimeSeconds: uptime,
    requestsPerMinute: uptime > 0 ? (analyticsStore.requests / (uptime / 60)).toFixed(2) : 0,
    endpoints: Object.fromEntries(analyticsStore.endpoints),
    styles: Object.fromEntries(analyticsStore.styles),
    formats: Object.fromEntries(analyticsStore.formats),
    errors: Object.fromEntries(analyticsStore.errors),
    instanceStartTime: new Date(analyticsStore.startTime).toISOString(),
  };
}

/**
 * Mask IP for privacy (show only first two octets)
 */
export function maskIP(ip: string): string {
  if (ip === 'unknown') return ip;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6 or other format
  return ip.substring(0, 8) + '...';
}
