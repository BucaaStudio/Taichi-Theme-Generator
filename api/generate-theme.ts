import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateTheme as sharedGenerateTheme } from '../utils/colorUtils.js';
import type { GenerationMode } from '../types.js';

/**
 * Taichi Theme Generator API
 * OKLCH-based dual-theme generation
 * Version: 25.12.2
 */

// --- Rate Limiting ---

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

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function parseLevel(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function inRange(value: number): boolean {
  return Number.isFinite(value) && value >= -5 && value <= 5;
}

// --- API Handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    const body = req.body || {};
    const mode = typeof body.mode === 'string'
      ? body.mode
      : (typeof body.style === 'string' ? body.style : 'random');

    const validStyles = [
      'monochrome', 'analogous', 'complementary', 'split-complementary',
      'triadic', 'tetradic', 'compound', 'triadic-split', 'random'
    ];

    if (!validStyles.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: `Invalid mode/style. Must be one of: ${validStyles.join(', ')}`,
        code: 'INVALID_STYLE'
      });
    }

    const baseColor = typeof body.baseColor === 'string'
      ? body.baseColor
      : (typeof body.seed === 'string' ? body.seed : undefined);

    if (baseColor && !/^#[0-9A-F]{6}$/i.test(baseColor)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid baseColor/seed format. Must be a hex color (e.g., #FF5733)',
        code: 'INVALID_BASE_COLOR'
      });
    }

    const splitAdjustments = parseBoolean(body.splitAdjustments ?? body.split, false);
    const darkFirst = parseBoolean(body.darkFirst, false);

    const saturation = parseLevel(body.saturationLevel ?? body.saturation ?? body.sat, 0);
    const contrast = parseLevel(body.contrastLevel ?? body.contrast ?? body.con, 0);
    const brightness = parseLevel(body.brightnessLevel ?? body.brightness ?? body.bri, 0);

    const lightSaturation = parseLevel(body.lightSaturationLevel ?? body.lsat, saturation);
    const lightContrast = parseLevel(body.lightContrastLevel ?? body.lcon, contrast);
    const lightBrightness = parseLevel(body.lightBrightnessLevel ?? body.lbri, brightness);

    const darkSaturation = parseLevel(body.darkSaturationLevel ?? body.dsat, saturation);
    const darkContrast = parseLevel(body.darkContrastLevel ?? body.dcon, contrast);
    const darkBrightness = parseLevel(body.darkBrightnessLevel ?? body.dbri, brightness);

    const levelsToValidate = splitAdjustments
      ? [lightSaturation, lightContrast, lightBrightness, darkSaturation, darkContrast, darkBrightness]
      : [saturation, contrast, brightness];

    if (!levelsToValidate.every(inRange)) {
      return res.status(400).json({
        success: false,
        error: 'Adjustment levels must be numbers between -5 and 5.',
        code: 'INVALID_PARAMETERS'
      });
    }

    const result = sharedGenerateTheme(
      mode as GenerationMode,
      baseColor,
      splitAdjustments ? lightSaturation : saturation,
      splitAdjustments ? lightContrast : contrast,
      splitAdjustments ? lightBrightness : brightness,
      undefined,
      darkFirst,
      splitAdjustments ? darkSaturation : saturation,
      splitAdjustments ? darkContrast : contrast,
      splitAdjustments ? darkBrightness : brightness
    );

    return res.status(200).json({
      success: true,
      light: result.light,
      dark: result.dark,
      metadata: {
        mode: result.mode,
        style: result.mode,
        seed: result.seed,
        timestamp: Date.now(),
        colorSpace: 'OKLCH',
        philosophy: getPhilosophy(result.mode),
        options: {
          darkFirst,
          splitAdjustments,
          saturationLevel: saturation,
          contrastLevel: contrast,
          brightnessLevel: brightness,
          lightSaturationLevel: splitAdjustments ? lightSaturation : saturation,
          lightContrastLevel: splitAdjustments ? lightContrast : contrast,
          lightBrightnessLevel: splitAdjustments ? lightBrightness : brightness,
          darkSaturationLevel: splitAdjustments ? darkSaturation : saturation,
          darkContrastLevel: splitAdjustments ? darkContrast : contrast,
          darkBrightnessLevel: splitAdjustments ? darkBrightness : brightness,
        }
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

function getPhilosophy(style: string): string {
  const philosophies: Record<string, string> = {
    'monochrome': 'Unity and simplicity through variations of a single hue.',
    'analogous': 'Harmony found in nature by choosing neighboring colors on the wheel.',
    'complementary': 'High-energy contrast by pairing opposites for maximum impact.',
    'split-complementary': 'Visual variety with less tension than a direct complement.',
    'triadic': 'A vibrant, balanced triangle of color for a bold UI.',
    'tetradic': 'Rich and complex harmony using four colors in two complementary pairs.',
    'compound': 'Balanced sophistication using multiple contrasting and adjacent hues.',
    'triadic-split': 'A wide, dynamic palette for complex design systems.',
    'random': 'Embracing spontaneity and the natural flow of creative energy.'
  };
  return philosophies[style] || philosophies.random;
}
