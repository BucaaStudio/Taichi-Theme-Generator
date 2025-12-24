import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from './utils/rate-limit';

/**
 * API Endpoint: Generate Theme
 * 
 * Generates a Taichi-inspired color theme based on the provided parameters.
 * 
 * Rate Limit: 10 requests per minute per IP (safe for Vercel free tier)
 * 
 * Request Body (JSON):
 * {
 *   "style": "yin-yang" | "five-elements" | "bagua" | "random",
 *   "baseColor": string (optional, hex color like "#FF5733"),
 *   "lockedColors": string[] (optional, array of color token names to preserve)
 * }
 * 
 * Response (JSON):
 * {
 *   "success": true,
 *   "theme": {
 *     "primary": string,
 *     "secondary": string,
 *     "accent": string,
 *     "background": string,
 *     "surface": string,
 *     "text": string,
 *     "textSecondary": string,
 *     "border": string
 *   },
 *   "metadata": {
 *     "style": string,
 *     "timestamp": number,
 *     "philosophy": string
 *   }
 * }
 * 
 * Error Response:
 * {
 *   "success": false,
 *   "error": string,
 *   "code": string
 * }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  // Apply rate limiting (10 requests per minute per IP)
  const rateLimitResult = await rateLimit(req, 10, 60000);
  if (!rateLimitResult.success) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateLimitResult.retryAfter
    });
  }

  try {
    const { style = 'random', baseColor, lockedColors = [] } = req.body || {};

    // Validate style parameter
    const validStyles = ['yin-yang', 'five-elements', 'bagua', 'random'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        success: false,
        error: `Invalid style. Must be one of: ${validStyles.join(', ')}`,
        code: 'INVALID_STYLE'
      });
    }

    // Validate baseColor if provided
    if (baseColor && !/^#[0-9A-F]{6}$/i.test(baseColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid baseColor format. Must be a hex color (e.g., #FF5733)',
        code: 'INVALID_BASE_COLOR'
      });
    }

    // Generate theme based on style
    const theme = generateTheme(style, baseColor, lockedColors);
    const philosophy = getPhilosophy(style);

    return res.status(200).json({
      success: true,
      theme,
      metadata: {
        style,
        timestamp: Date.now(),
        philosophy
      }
    });

  } catch (error) {
    console.error('Error generating theme:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error while generating theme',
      code: 'INTERNAL_ERROR'
    });
  }
}

// Helper function to generate theme colors
function generateTheme(
  style: string,
  baseColor?: string,
  lockedColors: string[] = []
): Record<string, string> {
  const theme: Record<string, string> = {};
  const colorTokens = [
    'primary',
    'secondary',
    'accent',
    'background',
    'surface',
    'text',
    'textSecondary',
    'border'
  ];

  // Generate colors based on style
  colorTokens.forEach(token => {
    if (lockedColors.includes(token)) {
      // Keep locked colors unchanged (would need to be passed in request)
      return;
    }

    switch (style) {
      case 'yin-yang':
        theme[token] = generateYinYangColor(token, baseColor);
        break;
      case 'five-elements':
        theme[token] = generateFiveElementsColor(token, baseColor);
        break;
      case 'bagua':
        theme[token] = generateBaguaColor(token, baseColor);
        break;
      default:
        theme[token] = generateRandomColor(token, baseColor);
    }
  });

  return theme;
}

// Yin-Yang style: Balance of light and dark
function generateYinYangColor(token: string, baseColor?: string): string {
  const isDark = ['text', 'textSecondary'].includes(token);
  const isLight = ['background', 'surface'].includes(token);
  
  if (isDark) {
    return `hsl(${Math.random() * 360}, ${10 + Math.random() * 20}%, ${10 + Math.random() * 15}%)`;
  } else if (isLight) {
    return `hsl(${Math.random() * 360}, ${10 + Math.random() * 20}%, ${85 + Math.random() * 10}%)`;
  } else {
    const hue = baseColor ? hexToHsl(baseColor).h : Math.random() * 360;
    return `hsl(${hue}, ${60 + Math.random() * 30}%, ${45 + Math.random() * 20}%)`;
  }
}

// Five Elements style: Wood, Fire, Earth, Metal, Water
function generateFiveElementsColor(token: string, baseColor?: string): string {
  const elements = {
    wood: { hue: 120, sat: 50, light: 45 },   // Green
    fire: { hue: 0, sat: 80, light: 50 },     // Red
    earth: { hue: 40, sat: 50, light: 50 },   // Yellow/Brown
    metal: { hue: 0, sat: 0, light: 70 },     // White/Gray
    water: { hue: 210, sat: 70, light: 40 }   // Blue
  };
  
  const elementKeys = Object.keys(elements);
  const element = elements[elementKeys[Math.floor(Math.random() * elementKeys.length)] as keyof typeof elements];
  
  return `hsl(${element.hue + (Math.random() - 0.5) * 30}, ${element.sat + (Math.random() - 0.5) * 20}%, ${element.light + (Math.random() - 0.5) * 20}%)`;
}

// Bagua style: Eight trigrams with varied colors
function generateBaguaColor(token: string, baseColor?: string): string {
  const bagua = [0, 45, 90, 135, 180, 225, 270, 315]; // 8 directions
  const hue = bagua[Math.floor(Math.random() * bagua.length)];
  const sat = 50 + Math.random() * 40;
  const light = 40 + Math.random() * 30;
  
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// Random style: Completely random colors
function generateRandomColor(token: string, baseColor?: string): string {
  const hue = baseColor ? hexToHsl(baseColor).h + (Math.random() - 0.5) * 60 : Math.random() * 360;
  const sat = 40 + Math.random() * 50;
  const light = 35 + Math.random() * 40;
  
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// Helper to convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Get philosophy description for each style
function getPhilosophy(style: string): string {
  const philosophies: Record<string, string> = {
    'yin-yang': 'Balance of opposites - light and dark, active and passive, creating harmony through contrast.',
    'five-elements': 'Wood, Fire, Earth, Metal, and Water - the five fundamental elements that create and control each other in endless cycles.',
    'bagua': 'Eight trigrams representing the fundamental principles of reality, each with unique energy and meaning.',
    'random': 'Embracing spontaneity and the natural flow of creative energy.'
  };
  
  return philosophies[style] || philosophies.random;
}
