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

    const validFormats = ['css', 'json', 'tailwind', 'scss', 'less'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        error: `Invalid format. Must be one of: ${validFormats.join(', ')}`,
        code: 'INVALID_FORMAT'
      });
    }

    const prefix = options.prefix || 'taichi';
    const includeComments = options.includeComments !== false;

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
