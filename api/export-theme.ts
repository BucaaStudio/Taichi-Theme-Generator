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

/**
 * API Endpoint: Export Theme
 * 
 * Exports a theme in various formats (CSS, JSON, Tailwind config, etc.)
 * 
 * Rate Limit: 15 requests per minute per IP
 * 
 * Request Body (JSON):
 * {
 *   "theme": {
 *     "primary": string,
 *     "secondary": string,
 *     "accent": string,
 *     "background": string,
 *     "card": string,
 *     "text": string,
 *     "textSecondary": string,
 *     "border": string
 *   },
 *   "format": "css" | "json" | "tailwind" | "scss" | "less",
 *   "options": {
 *     "prefix": string (optional, default: "taichi"),
 *     "includeComments": boolean (optional, default: true)
 *   }
 * }
 * 
 * Response (JSON):
 * {
 *   "success": true,
 *   "format": string,
 *   "content": string,
 *   "filename": string
 * }
import { logAnalyticsEvent, maskIP } from './utils/analytics';

function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return 'unknown';
}

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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    logAnalyticsEvent({
      endpoint: '/api/export-theme',
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
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Apply rate limiting (15 requests per minute per IP)
  const rateLimitResult = await rateLimit(req, 15, 60000);
  if (!rateLimitResult.success) {
    logAnalyticsEvent({
      endpoint: '/api/export-theme',
      method: 'POST',
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

  try {
    const { theme, format = 'css', options = {} } = req.body || {};

    // Validate theme object
    if (!theme || typeof theme !== 'object') {
      logAnalyticsEvent({
        endpoint: '/api/export-theme',
        method: 'POST',
        status: 400,
        duration: Date.now() - startTime,
        ip: maskIP(clientIP),
        userAgent,
        error: 'INVALID_THEME',
        timestamp: Date.now(),
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid theme object',
        code: 'INVALID_THEME'
      });
    }

    // Validate format
    const validFormats = ['css', 'json', 'tailwind', 'scss', 'less'];
    if (!validFormats.includes(format)) {
      logAnalyticsEvent({
        endpoint: '/api/export-theme',
        method: 'POST',
        status: 400,
        duration: Date.now() - startTime,
        ip: maskIP(clientIP),
        userAgent,
        format,
        error: 'INVALID_FORMAT',
        timestamp: Date.now(),
      });
      
      return res.status(400).json({
        success: false,
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        code: 'INVALID_FORMAT'
      });
    }

    const prefix = options.prefix || 'taichi';
    const includeComments = options.includeComments !== false;

    // Generate export content based on format
    let content: string;
    let filename: string;

    switch (format) {
      case 'css':
        content = exportAsCSS(theme, prefix, includeComments);
        filename = `${prefix}-theme.css`;
        break;
      case 'scss':
        content = exportAsSCSS(theme, prefix, includeComments);
        filename = `${prefix}-theme.scss`;
        break;
      case 'less':
        content = exportAsLESS(theme, prefix, includeComments);
        filename = `${prefix}-theme.less`;
        break;
      case 'tailwind':
        content = exportAsTailwind(theme, includeComments);
        filename = 'tailwind.config.js';
        break;
      case 'json':
      default:
        content = JSON.stringify(theme, null, 2);
        filename = `${prefix}-theme.json`;
    }

    // Log successful export
    logAnalyticsEvent({
      endpoint: '/api/export-theme',
      method: 'POST',
      status: 200,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      format,
      timestamp: Date.now(),
    });

    return res.status(200).json({
      success: true,
      format,
      content,
      filename
    });

  } catch (error) {
    console.error('Error exporting theme:', error);
    
    logAnalyticsEvent({
      endpoint: '/api/export-theme',
      method: 'POST',
      status: 500,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      error: 'INTERNAL_ERROR',
      timestamp: Date.now(),
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error while exporting theme',
      code: 'INTERNAL_ERROR'
    });
  }
}

// Export as CSS custom properties
function exportAsCSS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];
  
  if (includeComments) {
    lines.push('/**');
    lines.push(' * Taichi Theme Generator - Theme Export');
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' * Format: CSS Custom Properties');
    lines.push(' */\n');
  }
  
  lines.push(':root {');
  
  Object.entries(theme).forEach(([key, value]) => {
    const varName = `--${prefix}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    lines.push(`  ${varName}: ${value};`);
  });
  
  lines.push('}\n');
  
  if (includeComments) {
    lines.push('/* Usage example:');
    lines.push(` * color: var(--${prefix}-primary);`);
    lines.push(' */');
  }
  
  return lines.join('\n');
}

// Export as SCSS variables
function exportAsSCSS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];
  
  if (includeComments) {
    lines.push('//');
    lines.push('// Taichi Theme Generator - Theme Export');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// Format: SCSS Variables');
    lines.push('//\n');
  }
  
  Object.entries(theme).forEach(([key, value]) => {
    const varName = `$${prefix}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    lines.push(`${varName}: ${value};`);
  });
  
  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push(`// color: $${prefix}-primary;`);
  }
  
  return lines.join('\n');
}

// Export as LESS variables
function exportAsLESS(theme: Record<string, string>, prefix: string, includeComments: boolean): string {
  const lines: string[] = [];
  
  if (includeComments) {
    lines.push('//');
    lines.push('// Taichi Theme Generator - Theme Export');
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('// Format: LESS Variables');
    lines.push('//\n');
  }
  
  Object.entries(theme).forEach(([key, value]) => {
    const varName = `@${prefix}-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    lines.push(`${varName}: ${value};`);
  });
  
  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push(`// color: @${prefix}-primary;`);
  }
  
  return lines.join('\n');
}

// Export as Tailwind config
function exportAsTailwind(theme: Record<string, string>, includeComments: boolean): string {
  const lines: string[] = [];
  
  if (includeComments) {
    lines.push('/**');
    lines.push(' * Taichi Theme Generator - Theme Export');
    lines.push(` * Generated: ${new Date().toISOString()}`);
    lines.push(' * Format: Tailwind CSS Configuration');
    lines.push(' */\n');
  }
  
  lines.push('module.exports = {');
  lines.push('  theme: {');
  lines.push('    extend: {');
  lines.push('      colors: {');
  lines.push('        taichi: {');
  
  Object.entries(theme).forEach(([key, value], index, array) => {
    const isLast = index === array.length - 1;
    const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    lines.push(`          '${kebabKey}': '${value}'${isLast ? '' : ','}`);
  });
  
  lines.push('        }');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('}');
  
  if (includeComments) {
    lines.push('\n// Usage example:');
    lines.push('// <div className="bg-taichi-primary text-taichi-text">...');
  }
  
  return lines.join('\n');
}
