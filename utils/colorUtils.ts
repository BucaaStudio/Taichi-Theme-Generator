import { ThemeTokens, GenerationMode, ColorFormat } from '../types';
import { generateTheme as paletteEngineGenerateTheme } from './paletteEngine';

// --- Basic Math Helpers ---

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Apply brightness compression to a lightness value.
 */
function applyBrightness(lightness: number, brightnessLevel: number): number {
  if (brightnessLevel === 0) return lightness;
  
  const deviation = lightness - 50;
  const intensity = (Math.abs(brightnessLevel) / 5) * 0.6;
  
  if (brightnessLevel < 0) {
    if (deviation > 0) {
      return 50 + deviation * (1 - intensity);
    } else {
      return 50 + deviation * (1 - intensity * 0.3);
    }
  } else {
    if (deviation < 0) {
      return 50 + deviation * (1 - intensity);
    } else {
      return 50 + deviation * (1 - intensity * 0.3);
    }
  }
}

// Deterministic random based on a string seed
function getSeedValue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

// Returns a pseudo-random number between 0 and 1
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Find the closest hue to a target from an array of hues (circular distance)
function findClosestHue(hues: number[], targetHue: number): number {
  let closest = hues[0];
  let minDistance = 180;
  
  for (const hue of hues) {
    const distance = Math.min(
      Math.abs(hue - targetHue),
      360 - Math.abs(hue - targetHue)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = hue;
    }
  }
  return closest;
}

// --- Conversions ---

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

export function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hexToHsl(hex: string) {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hexToOklchRaw(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const linear = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lr = linear(r), lg = linear(g), lb = linear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073970037 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.sqrt(a * a + b_ * b_);
  let h = Math.atan2(b_, a) * (180 / Math.PI);
  if (h < 0) h += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

export function formatColor(hex: string, format: ColorFormat): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  switch (format) {
    case 'hex': return hex.toUpperCase();
    case 'rgb': return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case 'hsl': return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    case 'oklch': return hexToOklchRaw(hex);
    default: return hex.toUpperCase();
  }
}

/**
 * Parses user input into a valid Hex color string, or returns null if invalid.
 * Supports:
 * - Hex: #abc, #abcdef, abc, abcdef
 * - RGB: rgb(0,0,0), 0,0,0
 * - HSL: hsl(0,0%,0%)
 */
export function parseToHex(input: string, format?: ColorFormat): string | null {
  input = input.trim().toLowerCase();

  // 1. Try Hex
  // Match #RGB, #RRGGBB, RGB, RRGGBB
  const hexMatch = input.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    return '#' + hex;
  }

  // 2. Try RGB
  // valid formats: "rgb(255, 255, 255)", "255, 255, 255", "255 255 255"
  const rgbValues = input.match(/(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/);
  if (rgbValues) {
    const r = parseInt(rgbValues[1]);
    const g = parseInt(rgbValues[2]);
    const b = parseInt(rgbValues[3]);
    if (r <= 255 && g <= 255 && b <= 255) {
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
  }

  // 3. Try HSL
  // valid formats: "hsl(360, 100%, 50%)", "360, 100%, 50%"
  const hslValues = input.match(/(\d{1,3})[,\s]+(\d{1,3})%?[,\s]+(\d{1,3})%?/);
  if (hslValues && (input.includes('hsl') || format === 'hsl')) {
    const h = parseInt(hslValues[1]);
    const s = parseInt(hslValues[2]);
    const l = parseInt(hslValues[3]);
    if (h <= 360 && s <= 100 && l <= 100) {
      return hslToHex(h, s, l);
    }
  }

  return null;
}

// --- Generators ---

function randomHue(seedVal?: number) { 
  if (seedVal !== undefined) {
    return Math.floor(seededRandom(seedVal) * 360);
  }
  return Math.floor(Math.random() * 360); 
}

function getHarmonyHues(baseHue: number, mode: GenerationMode): number[] {
  switch (mode) {
    case 'monochrome': return [baseHue, baseHue, baseHue, baseHue, baseHue];
    case 'analogous': return [baseHue, (baseHue + 25) % 360, (baseHue + 50) % 360, (baseHue - 25 + 360) % 360, (baseHue - 50 + 360) % 360];
    case 'complementary': return [baseHue, (baseHue + 180) % 360, (baseHue + 30) % 360, (baseHue + 210) % 360, (baseHue - 30 + 360) % 360];
    case 'split-complementary': return [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360, (baseHue + 30) % 360, (baseHue + 180) % 360];
    case 'triadic': return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360, (baseHue + 60) % 360, (baseHue + 180) % 360];
    case 'tetradic': return [baseHue, (baseHue + 90) % 360, (baseHue + 180) % 360, (baseHue + 270) % 360, (baseHue + 45) % 360];
    case 'compound': return [baseHue, (baseHue + 165) % 360, (baseHue + 180) % 360, (baseHue + 195) % 360, (baseHue + 30) % 360];
    case 'triadic-split': return [baseHue, (baseHue + 120) % 360, (baseHue + 150) % 360, (baseHue + 240) % 360, (baseHue + 270) % 360];
    default: return [baseHue, (baseHue + 72) % 360, (baseHue + 144) % 360, (baseHue + 216) % 360, (baseHue + 288) % 360];
  }
}

// --- Theme Builder ---

export function generateTheme(
  mode: GenerationMode, 
  seedColor?: string, 
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[]
): { light: ThemeTokens, dark: ThemeTokens, seed: string } {
  // Delegate to the new OKLCH-based palette engine (v25.12.2)
  return paletteEngineGenerateTheme(
    mode,
    seedColor,
    saturationLevel,
    contrastLevel,
    brightnessLevel,
    overridePalette
  );
}

export async function extractPaletteFromImage(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("No context");
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const colorCounts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4 * 4) {
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          if (a < 128) continue;
          const qr = Math.round(r / 16) * 16, qg = Math.round(g / 16) * 16, qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
        const sortedColors = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).map(([key]) => {
            const [r, g, b] = key.split(',').map(Number);
            return { r, g, b, hsl: rgbToHsl(r, g, b) };
          });
        const palette: string[] = [];
        const minHueDiff = 20;
        for (const c of sortedColors) {
          if (palette.length >= 5) break;
          const isTooSimilar = palette.some(existingHex => {
            const extHsl = hexToHsl(existingHex);
            const hueDiff = Math.min(Math.abs(extHsl.h - c.hsl.h), 360 - Math.abs(extHsl.h - c.hsl.h));
            return hueDiff < minHueDiff && Math.abs(extHsl.s - c.hsl.s) < 20 && Math.abs(extHsl.l - c.hsl.l) < 20;
          });
          if (!isTooSimilar) palette.push(hslToHex(c.hsl.h, c.hsl.s, c.hsl.l));
        }
        if (palette.length < 5) {
          for (const c of sortedColors) {
            if (palette.length >= 5) break;
            const hex = hslToHex(c.hsl.h, c.hsl.s, c.hsl.l);
            if (!palette.includes(hex)) palette.push(hex);
          }
        }
        resolve(palette.length > 0 ? palette : ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}