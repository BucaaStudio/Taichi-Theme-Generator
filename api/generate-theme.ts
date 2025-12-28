import type { VercelRequest, VercelResponse } from '@vercel/node';

// Inline rate limiting implementation
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

// --- Inline Color Utilities (Self-Contained) ---

type GenerationMode = 'random' | 'monochrome' | 'analogous' | 'complementary' | 
  'split-complementary' | 'triadic' | 'tetradic' | 'compound' | 'triadic-split';

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

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

function getRelativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function selectForeground(bgHex: string): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}

// Seeded random for reproducibility
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
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

const HARMONY_OFFSETS: Record<string, number[]> = {
  monochrome: [0, 0, 0, 0, 0],
  analogous: [0, 30, -30, 15, -15],
  complementary: [0, 180, 30, 210, -30],
  'split-complementary': [0, 150, 210, 30, 180],
  triadic: [0, 120, 240, 60, 180],
  tetradic: [0, 90, 180, 270, 45],
  compound: [0, 165, 180, 195, 30],
  'triadic-split': [0, 120, 150, 240, 270],
};

function generateTheme(
  mode: GenerationMode,
  baseColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0
): { light: ThemeTokens; dark: ThemeTokens; seed: string; mode: GenerationMode } {
  const rngSeed = baseColor || `${Date.now()}-${Math.random()}`;
  const rng = new SeededRandom(rngSeed);
  
  let harmonyMode: GenerationMode = mode;
  if (mode === 'random') {
    const modes: GenerationMode[] = ['analogous', 'complementary', 'split-complementary', 'triadic', 'tetradic', 'compound', 'triadic-split'];
    harmonyMode = modes[rng.nextInt(0, modes.length - 1)];
  }
  
  const baseHue = baseColor ? hexToHsl(baseColor).h : rng.nextInt(0, 359);
  const offsets = HARMONY_OFFSETS[harmonyMode] || HARMONY_OFFSETS.analogous;
  const hues = offsets.map(o => (baseHue + o + 360) % 360);
  
  // Saturation and brightness modifiers
  const satMod = 1 + saturationLevel * 0.1;
  const briMod = brightnessLevel * 3;
  const conMod = contrastLevel * 2;
  
  // Generate light theme
  const baseSat = Math.max(10, Math.min(90, 60 * satMod));
  const baseLit = Math.max(30, Math.min(60, 50 + briMod));
  
  const primary = hslToHex(hues[0], baseSat, baseLit);
  const secondary = hslToHex(hues[1], baseSat * 0.85, baseLit + 5);
  const accent = hslToHex(hues[2], baseSat * 1.1, baseLit - 5);
  const good = hslToHex(140, baseSat * 0.9, baseLit);
  const warn = hslToHex(45, baseSat, baseLit + 10);
  const bad = hslToHex(0, baseSat, baseLit);
  
  const bgL = Math.max(92, Math.min(99, 96 + briMod * 0.5));
  const cardL = bgL - 3 - conMod * 0.5;
  const textL = Math.max(5, Math.min(25, 15 - briMod * 0.3 - conMod));
  
  const light: ThemeTokens = {
    bg: hslToHex(hues[0], 5, bgL),
    card: hslToHex(hues[0], 6, cardL),
    card2: hslToHex(hues[0], 7, cardL - 3),
    text: hslToHex(hues[0], 10, textL),
    textMuted: hslToHex(hues[0], 8, textL + 25),
    textOnColor: '#FFFFFF',
    primary,
    primaryFg: selectForeground(primary),
    secondary,
    secondaryFg: selectForeground(secondary),
    accent,
    accentFg: selectForeground(accent),
    border: hslToHex(hues[0], 10, 82),
    ring: primary,
    good,
    goodFg: selectForeground(good),
    warn,
    warnFg: selectForeground(warn),
    bad,
    badFg: selectForeground(bad),
  };
  
  // Generate dark theme (derived)
  const darkBgL = Math.max(5, Math.min(15, 10 - briMod * 0.3));
  const darkCardL = darkBgL + 4 + conMod * 0.3;
  const darkTextL = Math.min(98, Math.max(85, 92 + briMod * 0.2));
  
  const darkPrimary = hslToHex(hues[0], baseSat * 0.9, baseLit + 10);
  const darkSecondary = hslToHex(hues[1], baseSat * 0.8, baseLit + 8);
  const darkAccent = hslToHex(hues[2], baseSat, baseLit + 12);
  const darkGood = hslToHex(140, baseSat * 0.85, baseLit + 8);
  const darkWarn = hslToHex(45, baseSat * 0.9, baseLit + 12);
  const darkBad = hslToHex(0, baseSat * 0.9, baseLit + 8);
  
  const dark: ThemeTokens = {
    bg: hslToHex(hues[0], 8, darkBgL),
    card: hslToHex(hues[0], 10, darkCardL),
    card2: hslToHex(hues[0], 12, darkCardL + 3),
    text: hslToHex(hues[0], 5, darkTextL),
    textMuted: hslToHex(hues[0], 6, darkTextL - 25),
    textOnColor: '#FFFFFF',
    primary: darkPrimary,
    primaryFg: selectForeground(darkPrimary),
    secondary: darkSecondary,
    secondaryFg: selectForeground(darkSecondary),
    accent: darkAccent,
    accentFg: selectForeground(darkAccent),
    border: hslToHex(hues[0], 15, 25),
    ring: darkPrimary,
    good: darkGood,
    goodFg: selectForeground(darkGood),
    warn: darkWarn,
    warnFg: selectForeground(darkWarn),
    bad: darkBad,
    badFg: selectForeground(darkBad),
  };
  
  return {
    light,
    dark,
    seed: baseColor || hslToHex(baseHue, 60, 50),
    mode: harmonyMode,
  };
}

// --- API Handler ---

// Simple analytics logging (captured by Vercel logs)
function logApiEvent(data: Record<string, any>) {
  console.log(JSON.stringify({ type: 'api_analytics', ...data }));
}

function maskIP(ip: string): string {
  if (ip === 'unknown') return ip;
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.substring(0, 8) + '...';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    logApiEvent({
      endpoint: '/api/generate-theme',
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

  const rateLimitResult = await rateLimit(req, 10, 60000);
  if (!rateLimitResult.success) {
    logApiEvent({
      endpoint: '/api/generate-theme',
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
    const { 
      style = 'random', 
      baseColor, 
      saturation = 0,
      contrast = 0,
      brightness = 0
    } = req.body || {};

    const validStyles = [
      'monochrome', 'analogous', 'complementary', 'split-complementary', 
      'triadic', 'tetradic', 'compound', 'triadic-split', 'random'
    ];
    
    if (!validStyles.includes(style)) {
      logApiEvent({
        endpoint: '/api/generate-theme',
        method: 'POST',
        status: 400,
        duration: Date.now() - startTime,
        ip: maskIP(clientIP),
        userAgent,
        style,
        error: 'INVALID_STYLE',
        timestamp: Date.now(),
      });
      
      return res.status(400).json({
        success: false,
        error: `Invalid style. Must be one of: ${validStyles.join(', ')}`,
        code: 'INVALID_STYLE'
      });
    }

    const checkRange = (val: any) => typeof val === 'number' && val >= -5 && val <= 5;
    if (!checkRange(saturation) || !checkRange(contrast) || !checkRange(brightness)) {
      logApiEvent({
        endpoint: '/api/generate-theme',
        method: 'POST',
        status: 400,
        duration: Date.now() - startTime,
        ip: maskIP(clientIP),
        userAgent,
        style,
        error: 'INVALID_PARAMETERS',
        timestamp: Date.now(),
      });
      
      return res.status(400).json({
        success: false,
        error: 'Parameters saturation, contrast, and brightness must be numbers between -5 and 5.',
        code: 'INVALID_PARAMETERS'
      });
    }

    if (baseColor && !/^#[0-9A-F]{6}$/i.test(baseColor)) {
      logApiEvent({
        endpoint: '/api/generate-theme',
        method: 'POST',
        status: 400,
        duration: Date.now() - startTime,
        ip: maskIP(clientIP),
        userAgent,
        style,
        error: 'INVALID_BASE_COLOR',
        timestamp: Date.now(),
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid baseColor format. Must be a hex color (e.g., #FF5733)',
        code: 'INVALID_BASE_COLOR'
      });
    }

    const result = generateTheme(
      style as GenerationMode, 
      baseColor, 
      saturation, 
      contrast, 
      brightness
    );

    // Log successful generation
    logApiEvent({
      endpoint: '/api/generate-theme',
      method: 'POST',
      status: 200,
      duration: Date.now() - startTime,
      ip: maskIP(clientIP),
      userAgent,
      style: result.mode,
      timestamp: Date.now(),
    });

    return res.status(200).json({
      success: true,
      light: result.light,
      dark: result.dark,
      metadata: {
        style: result.mode,
        seed: result.seed,
        timestamp: Date.now(),
        philosophy: getPhilosophy(result.mode)
      }
    });

  } catch (error) {
    console.error('Error generating theme:', error);
    
    logApiEvent({
      endpoint: '/api/generate-theme',
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

