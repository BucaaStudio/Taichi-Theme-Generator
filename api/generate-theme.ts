import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateTheme as sharedGenerateTheme } from '../utils/colorUtils';

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

// --- OKLCH Color Space ---

interface OklchColor {
  L: number;  // Lightness: 0-1
  C: number;  // Chroma: 0-0.4
  H: number;  // Hue: 0-360
}

function linearizeChannel(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function delinearizeChannel(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, v * 255)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
    .join('');
}

function toOklch(hex: string): OklchColor {
  const { r, g, b } = hexToRgb(hex);
  const lr = linearizeChannel(r);
  const lg = linearizeChannel(g);
  const lb = linearizeChannel(b);
  
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073970037 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  
  const C = Math.sqrt(a * a + b_ * b_);
  let H = Math.atan2(b_, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  
  return { L, C, H };
}

function toHex(color: OklchColor): string {
  const { L, C, H } = color;
  if (L <= 0) return '#000000';
  if (L >= 1) return '#ffffff';
  
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  
  return rgbToHex(delinearizeChannel(lr), delinearizeChannel(lg), delinearizeChannel(lb));
}

function clampToSRGBGamut(color: OklchColor): OklchColor {
  // Binary search for max in-gamut chroma
  let low = 0;
  let high = color.C;
  let result = { ...color, C: 0 };
  
  for (let i = 0; i < 10; i++) {
    const mid = (low + high) / 2;
    const test = { ...color, C: mid };
    const hex = toHex(test);
    const back = toOklch(hex);
    
    if (Math.abs(back.L - test.L) < 0.02 && Math.abs(back.C - test.C) < 0.02) {
      low = mid;
      result = test;
    } else {
      high = mid;
    }
  }
  return result;
}

// --- Contrast Utilities ---

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toL = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function selectForeground(bgHex: string): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}

// --- Seeded Random ---

class SeededRandom {
  private seed: number;
  constructor(seed: string | number) {
    this.seed = typeof seed === 'string' ? this.hashString(seed) : seed;
  }
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// --- Harmony Modes ---

const HARMONY_MODES: Record<string, number[]> = {
  monochrome: [0, 0, 0, 0, 0],
  analogous: [0, 30, -30, 15, -15],
  complementary: [0, 180, 30, 210, -30],
  'split-complementary': [0, 150, 210, 30, 180],
  triadic: [0, 120, 240, 60, 180],
  tetradic: [0, 90, 180, 270, 45],
  compound: [0, 165, 180, 195, 30],
  'triadic-split': [0, 120, 150, 240, 270],
};

// --- Theme Tokens ---

interface ThemeTokens {
  bg: string;
  card: string;
  card2: string;
  text: string;
  textMuted: string;
  textOnColor: string;
  primary: string;
  primaryFg: string;
  secondary: string;
  secondaryFg: string;
  accent: string;
  accentFg: string;
  border: string;
  ring: string;
  good: string;
  goodFg: string;
  warn: string;
  warnFg: string;
  bad: string;
  badFg: string;
}

type GenerationMode = 'random' | 'monochrome' | 'analogous' | 'complementary' | 
  'split-complementary' | 'triadic' | 'tetradic' | 'compound' | 'triadic-split';

// --- OKLCH Theme Generator ---

function generateTheme(
  mode: GenerationMode,
  baseColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0
): { light: ThemeTokens; dark: ThemeTokens; seed: string; mode: GenerationMode } {
  const rngSeed = baseColor || `${Date.now()}-${Math.random()}`;
  const rng = new SeededRandom(rngSeed);
  
  // Pick harmony mode
  let harmonyMode: GenerationMode = mode;
  if (mode === 'random') {
    const modes: GenerationMode[] = ['analogous', 'complementary', 'split-complementary', 'triadic', 'tetradic', 'compound', 'triadic-split'];
    harmonyMode = modes[Math.floor(rng.next() * modes.length)];
  }
  
  // Get base hue from color or random
  const baseHue = baseColor ? toOklch(baseColor).H : rng.nextFloat(0, 360);
  const offsets = HARMONY_MODES[harmonyMode] || HARMONY_MODES.analogous;
  const hues = offsets.map(o => ((baseHue + o) % 360 + 360) % 360);
  
  // Apply modifiers
  const satMod = 1 + saturationLevel * 0.12;
  const briMod = brightnessLevel * 0.025;
  const conMod = contrastLevel * 0.02;
  
  // --- Light Theme (OKLCH) ---
  const lightBgL = Math.min(0.99, Math.max(0.92, 0.97 + briMod));
  const lightCardL = lightBgL - 0.04 - conMod * 0.5;
  const lightCard2L = lightCardL - 0.03;
  const lightTextL = Math.max(0.10, 0.18 - briMod * 0.5 - conMod);
  const lightTextMutedL = 0.45;
  const lightBorderL = 0.82;
  
  // Brand colors (OKLCH with chroma)
  const baseChroma = Math.min(0.18, Math.max(0.08, 0.14 * satMod));
  const primaryL = 0.55 + briMod * 0.5;
  const secondaryL = 0.58 + briMod * 0.4;
  const accentL = 0.52 + briMod * 0.3;
  
  const lightPrimary = clampToSRGBGamut({ L: primaryL, C: baseChroma, H: hues[0] });
  const lightSecondary = clampToSRGBGamut({ L: secondaryL, C: baseChroma * 0.85, H: hues[1] });
  const lightAccent = clampToSRGBGamut({ L: accentL, C: baseChroma * 1.1, H: hues[2] });
  
  // Status colors (fixed semantic hues)
  const goodL = 0.55 + briMod * 0.3;
  const warnL = 0.65 + briMod * 0.3;
  const badL = 0.52 + briMod * 0.3;
  
  const lightGood = clampToSRGBGamut({ L: goodL, C: baseChroma * 0.9, H: 145 });
  const lightWarn = clampToSRGBGamut({ L: warnL, C: baseChroma * 0.85, H: 85 });
  const lightBad = clampToSRGBGamut({ L: badL, C: baseChroma * 0.95, H: 25 });
  
  // Neutrals (minimal chroma)
  const neutralC = 0.005;
  const lightBg = clampToSRGBGamut({ L: lightBgL, C: neutralC, H: hues[0] });
  const lightCard = clampToSRGBGamut({ L: lightCardL, C: neutralC * 1.2, H: hues[0] });
  const lightCard2 = clampToSRGBGamut({ L: lightCard2L, C: neutralC * 1.4, H: hues[0] });
  const lightText = clampToSRGBGamut({ L: lightTextL, C: neutralC * 2, H: hues[0] });
  const lightTextMuted = clampToSRGBGamut({ L: lightTextMutedL, C: neutralC * 1.5, H: hues[0] });
  const lightBorder = clampToSRGBGamut({ L: lightBorderL, C: neutralC * 2, H: hues[0] });
  
  const light: ThemeTokens = {
    bg: toHex(lightBg),
    card: toHex(lightCard),
    card2: toHex(lightCard2),
    text: toHex(lightText),
    textMuted: toHex(lightTextMuted),
    textOnColor: '#FFFFFF',
    primary: toHex(lightPrimary),
    primaryFg: selectForeground(toHex(lightPrimary)),
    secondary: toHex(lightSecondary),
    secondaryFg: selectForeground(toHex(lightSecondary)),
    accent: toHex(lightAccent),
    accentFg: selectForeground(toHex(lightAccent)),
    border: toHex(lightBorder),
    ring: toHex(lightPrimary),
    good: toHex(lightGood),
    goodFg: selectForeground(toHex(lightGood)),
    warn: toHex(lightWarn),
    warnFg: selectForeground(toHex(lightWarn)),
    bad: toHex(lightBad),
    badFg: selectForeground(toHex(lightBad)),
  };
  
  // --- Dark Theme (OKLCH) ---
  const darkBgL = Math.max(0.05, Math.min(0.12, 0.08 - briMod * 0.3));
  const darkCardL = darkBgL + 0.05 + conMod * 0.3;
  const darkCard2L = darkCardL + 0.03;
  const darkTextL = Math.min(0.98, 0.92 + briMod * 0.3);
  const darkTextMutedL = 0.62;
  const darkBorderL = 0.25;
  
  // Adjusted brand colors for dark mode
  const darkPrimaryL = primaryL + 0.08;
  const darkSecondaryL = secondaryL + 0.06;
  const darkAccentL = accentL + 0.1;
  
  const darkPrimary = clampToSRGBGamut({ L: darkPrimaryL, C: baseChroma * 0.9, H: hues[0] });
  const darkSecondary = clampToSRGBGamut({ L: darkSecondaryL, C: baseChroma * 0.8, H: hues[1] });
  const darkAccent = clampToSRGBGamut({ L: darkAccentL, C: baseChroma, H: hues[2] });
  
  const darkGood = clampToSRGBGamut({ L: goodL + 0.06, C: baseChroma * 0.85, H: 145 });
  const darkWarn = clampToSRGBGamut({ L: warnL + 0.06, C: baseChroma * 0.8, H: 85 });
  const darkBad = clampToSRGBGamut({ L: badL + 0.08, C: baseChroma * 0.9, H: 25 });
  
  const darkNeutralC = 0.008;
  const darkBg = clampToSRGBGamut({ L: darkBgL, C: darkNeutralC, H: hues[0] });
  const darkCard = clampToSRGBGamut({ L: darkCardL, C: darkNeutralC * 1.3, H: hues[0] });
  const darkCard2 = clampToSRGBGamut({ L: darkCard2L, C: darkNeutralC * 1.5, H: hues[0] });
  const darkText = clampToSRGBGamut({ L: darkTextL, C: darkNeutralC, H: hues[0] });
  const darkTextMuted = clampToSRGBGamut({ L: darkTextMutedL, C: darkNeutralC * 1.2, H: hues[0] });
  const darkBorder = clampToSRGBGamut({ L: darkBorderL, C: darkNeutralC * 2, H: hues[0] });
  
  const dark: ThemeTokens = {
    bg: toHex(darkBg),
    card: toHex(darkCard),
    card2: toHex(darkCard2),
    text: toHex(darkText),
    textMuted: toHex(darkTextMuted),
    textOnColor: '#FFFFFF',
    primary: toHex(darkPrimary),
    primaryFg: selectForeground(toHex(darkPrimary)),
    secondary: toHex(darkSecondary),
    secondaryFg: selectForeground(toHex(darkSecondary)),
    accent: toHex(darkAccent),
    accentFg: selectForeground(toHex(darkAccent)),
    border: toHex(darkBorder),
    ring: toHex(darkPrimary),
    good: toHex(darkGood),
    goodFg: selectForeground(toHex(darkGood)),
    warn: toHex(darkWarn),
    warnFg: selectForeground(toHex(darkWarn)),
    bad: toHex(darkBad),
    badFg: selectForeground(toHex(darkBad)),
  };
  
  return {
    light,
    dark,
    seed: baseColor || toHex(clampToSRGBGamut({ L: 0.5, C: 0.15, H: baseHue })),
    mode: harmonyMode,
  };
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
