/**
 * OKLCH Color Utility Module
 * All color computation happens in OKLCH color space
 * Version: 25.12.2
 */

export interface OklchColor {
  L: number;  // Lightness: 0-1
  C: number;  // Chroma: 0-0.4 (typical range)
  H: number;  // Hue: 0-360
}

// --- RGB/sRGB Helpers ---

function linearizeChannel(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function delinearizeChannel(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, v * 255)));
}

// --- Hex Conversion ---

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

// --- OKLCH Conversion ---

export function toOklch(hex: string): OklchColor {
  const { r, g, b } = hexToRgb(hex);
  
  // Linearize sRGB
  const lr = linearizeChannel(r);
  const lg = linearizeChannel(g);
  const lb = linearizeChannel(b);
  
  // sRGB to Linear LMS
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073970037 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  
  // LMS to Oklab
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  
  // Oklab to OKLCH
  const C = Math.sqrt(a * a + b_ * b_);
  let H = Math.atan2(b_, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  
  return { L, C, H };
}

export function toHex(color: OklchColor): string {
  const { L, C, H } = color;
  
  // Edge cases
  if (L <= 0) return '#000000';
  if (L >= 1) return '#ffffff';
  
  // OKLCH to Oklab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  
  // Oklab to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  
  // LMS to Linear sRGB
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  
  // Delinearize to sRGB
  const r = delinearizeChannel(lr);
  const g = delinearizeChannel(lg);
  const rb = delinearizeChannel(lb);
  
  return rgbToHex(r, g, rb);
}

// --- Gamut Mapping ---

export function isInSRGBGamut(color: OklchColor): boolean {
  const hex = toHex(color);
  const roundTrip = toOklch(hex);
  
  // Check if round-trip preserves the color (small tolerance)
  const dL = Math.abs(roundTrip.L - color.L);
  const dC = Math.abs(roundTrip.C - color.C);
  const dH = Math.min(Math.abs(roundTrip.H - color.H), 360 - Math.abs(roundTrip.H - color.H));
  
  return dL < 0.01 && dC < 0.02 && (color.C < 0.01 || dH < 5);
}

export function clampToSRGBGamut(color: OklchColor): OklchColor {
  // Binary search for maximum chroma that stays in gamut
  if (isInSRGBGamut(color)) return color;
  
  let low = 0;
  let high = color.C;
  let result = { ...color, C: 0 };
  
  while (high - low > 0.001) {
    const mid = (low + high) / 2;
    const test = { ...color, C: mid };
    
    if (isInSRGBGamut(test)) {
      low = mid;
      result = test;
    } else {
      high = mid;
    }
  }
  
  return result;
}

// --- Color Difference ---

export function deltaE(a: OklchColor, b: OklchColor): number {
  // Calculate perceptual difference using Oklab
  const aRad = (a.H * Math.PI) / 180;
  const bRad = (b.H * Math.PI) / 180;
  
  const aA = a.C * Math.cos(aRad);
  const aB = a.C * Math.sin(aRad);
  const bA = b.C * Math.cos(bRad);
  const bB = b.C * Math.sin(bRad);
  
  const dL = b.L - a.L;
  const dA = bA - aA;
  const dB = bB - aB;
  
  return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

// --- Hue Distance ---

export function hueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

// --- Color Manipulation ---

export function adjustLightness(color: OklchColor, delta: number): OklchColor {
  return clampToSRGBGamut({
    ...color,
    L: Math.max(0, Math.min(1, color.L + delta)),
  });
}

export function adjustChroma(color: OklchColor, factor: number): OklchColor {
  return clampToSRGBGamut({
    ...color,
    C: Math.max(0, color.C * factor),
  });
}

export function shiftHue(color: OklchColor, degrees: number): OklchColor {
  return {
    ...color,
    H: ((color.H + degrees) % 360 + 360) % 360,
  };
}

// --- Neutral Color Creation ---

export function createNeutral(L: number, baseHue: number, warmth: number = 0): OklchColor {
  // Slight chroma tint based on warmth (-1 cool, 0 neutral, 1 warm)
  const tintC = Math.abs(warmth) * 0.008;
  const tintH = warmth > 0 ? 60 : 240; // Warm = yellow-ish, Cool = blue-ish
  
  return clampToSRGBGamut({
    L,
    C: tintC,
    H: warmth !== 0 ? tintH : baseHue,
  });
}

// --- Scale Generation ---

export function generateScale(
  baseColor: OklchColor,
  steps: number[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]
): Map<number, OklchColor> {
  const scale = new Map<number, OklchColor>();
  
  for (const step of steps) {
    // Map step to lightness: 50 -> high L, 900 -> low L
    const targetL = 1 - (step / 1000);
    // Chroma peaks in the middle, decreases at extremes
    const chromaFactor = 1 - Math.abs(targetL - 0.5) * 1.2;
    
    scale.set(step, clampToSRGBGamut({
      L: targetL,
      C: baseColor.C * Math.max(0.3, chromaFactor),
      H: baseColor.H,
    }));
  }
  
  return scale;
}

// --- Utility Exports ---

export function formatOklch(color: OklchColor): string {
  return `oklch(${color.L.toFixed(3)} ${color.C.toFixed(3)} ${color.H.toFixed(1)})`;
}

export function parseOklch(str: string): OklchColor | null {
  const match = str.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return null;
  
  return {
    L: parseFloat(match[1]),
    C: parseFloat(match[2]),
    H: parseFloat(match[3]),
  };
}
