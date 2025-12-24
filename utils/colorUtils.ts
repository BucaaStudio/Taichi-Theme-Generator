import { ThemeTokens, GenerationMode, ColorFormat } from '../types';

// --- Basic Math Helpers ---

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
}

/**
 * Apply brightness compression to a lightness value.
 * 
 * @param lightness - Original lightness value (0-100)
 * @param brightnessLevel - Brightness level (-5 to 5)
 *   - negative: Compresses toward dark (dim)
 *   - 0: Normal (no change)
 *   - positive: Compresses toward bright (bright)
 */
function applyBrightness(lightness: number, brightnessLevel: number): number {
  if (brightnessLevel === 0) return lightness;
  
  const deviation = lightness - 50;
  
  // Compression intensity (0 to ~0.6)
  // Max compression at level 5
  const intensity = (Math.abs(brightnessLevel) / 5) * 0.6;
  
  if (brightnessLevel < 0) {
    // Dim mode: compress bright colors toward 50 (or lower, effectively darkening)
    // Actually, "dimming" typically means pushing towards dark. 
    // The previous logic pushed bright colors down.
    if (deviation > 0) {
      return 50 + deviation * (1 - intensity);
    } else {
      return 50 + deviation * (1 - intensity * 0.3);
    }
  } else {
    // Bright mode: compress dark colors up toward 50
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
  let minDistance = 180; // max possible circular distance
  
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

// HSL to Hex
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

// Hex to RGB
export function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number, s: number, l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
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

// Hex to HSL
export function hexToHsl(hex: string) {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

// Approximation of OKLCH string (Standard CSS format)
export function hexToOklchRaw(hex: string): string {
    const { r, g, b } = hexToRgb(hex);
    // 1. Convert to linear sRGB
    const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lr = linear(r), lg = linear(g), lb = linear(b);

    // 2. Linear sRGB to LMS
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    // 3. LMS to OKLCH
    const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const C = Math.sqrt(Math.pow(1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_, 2) + Math.pow(0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_, 2));
    let h = Math.atan2(0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_, 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_) * 180 / Math.PI;
    
    if (h < 0) h += 360;

    // Return raw values: L% C H
    return `${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)}`;
}

// Convert Hex to LCH (CIE LCH)
export function hexToLch(hex: string): { l: number; c: number; h: number } {
    const { r, g, b } = hexToRgb(hex);
    
    // Convert to XYZ
    const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lr = linear(r), lg = linear(g), lb = linear(b);
    
    const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
    const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100;
    const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100;
    
    // Convert XYZ to LAB
    const xn = 95.047, yn = 100.000, zn = 108.883; // D65 illuminant
    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    
    const fx = f(x / xn);
    const fy = f(y / yn);
    const fz = f(z / zn);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);
    
    // Convert LAB to LCH
    const C = Math.sqrt(a * a + b_lab * b_lab);
    let H = Math.atan2(b_lab, a) * 180 / Math.PI;
    if (H < 0) H += 360;
    
    return { l: L, c: C, h: H };
}

// Convert Hex to LAB (CIE LAB)
export function hexToLab(hex: string): { l: number; a: number; b: number } {
    const { r, g, b: b_rgb } = hexToRgb(hex);
    
    // Convert to XYZ
    const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const lr = linear(r), lg = linear(g), lb = linear(b_rgb);
    
    const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100;
    const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100;
    const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100;
    
    // Convert XYZ to LAB
    const xn = 95.047, yn = 100.000, zn = 108.883; // D65 illuminant
    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    
    const fx = f(x / xn);
    const fy = f(y / yn);
    const fz = f(z / zn);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);
    
    return { l: L, a, b: b_lab };
}

// Convert Hex to CMYK
export function hexToCmyk(hex: string): { c: number; m: number; y: number; k: number } {
    const { r, g, b } = hexToRgb(hex);
    
    // Normalize RGB values to 0-1
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    // Calculate K (black)
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    
    // Calculate CMY
    const c = k === 1 ? 0 : (1 - rNorm - k) / (1 - k);
    const m = k === 1 ? 0 : (1 - gNorm - k) / (1 - k);
    const y = k === 1 ? 0 : (1 - bNorm - k) / (1 - k);
    
    return { 
        c: Math.round(c * 100), 
        m: Math.round(m * 100), 
        y: Math.round(y * 100), 
        k: Math.round(k * 100) 
    };
}

// Convert Hex to Display P3
export function hexToDisplayP3(hex: string): { r: number; g: number; b: number } {
    const { r: r_srgb, g: g_srgb, b: b_srgb } = hexToRgb(hex);
    
    // Convert sRGB to linear RGB
    const linear = (c: number) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    
    const r_linear = linear(r_srgb);
    const g_linear = linear(g_srgb);
    const b_linear = linear(b_srgb);
    
    // Convert linear sRGB to linear Display P3 using matrix transformation
    const r_p3 = r_linear * 0.8224621 + g_linear * 0.1775380 + b_linear * 0.0000000;
    const g_p3 = r_linear * 0.0331941 + g_linear * 0.9668058 + b_linear * 0.0000000;
    const b_p3 = r_linear * 0.0170827 + g_linear * 0.0723974 + b_linear * 0.9105199;
    
    // Apply Display P3 gamma (same as sRGB)
    const gamma = (c: number) => {
        return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };
    
    return {
        r: Math.max(0, Math.min(1, gamma(r_p3))),
        g: Math.max(0, Math.min(1, gamma(g_p3))),
        b: Math.max(0, Math.min(1, gamma(b_p3)))
    };
}

export function formatColor(hex: string, format: ColorFormat): string {
    if (format === 'hex') return hex.toUpperCase();
    if (format === 'rgb') {
        const {r,g,b} = hexToRgb(hex);
        return `rgb(${r}, ${g}, ${b})`;
    }
    if (format === 'cmyk') {
        const {c, m, y, k} = hexToCmyk(hex);
        return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`;
    }
    if (format === 'hsl') {
        const {h,s,l} = hexToHsl(hex);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
    if (format === 'lab') {
        const {l, a, b} = hexToLab(hex);
        return `lab(${l.toFixed(1)}% ${a.toFixed(2)} ${b.toFixed(2)})`;
    }
    if (format === 'lch') {
        const {l, c, h} = hexToLch(hex);
        return `lch(${l.toFixed(1)}% ${c.toFixed(2)} ${h.toFixed(1)})`;
    }
    if (format === 'oklch') {
        return `oklch(${hexToOklchRaw(hex)})`;
    }
    if (format === 'display-p3') {
        const {r, g, b} = hexToDisplayP3(hex);
        return `color(display-p3 ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)})`;
    }
    return hex;
}

// Parse user input back to Hex using DOM engine for robustness
export function parseToHex(input: string, contextFormat: ColorFormat): string | null {
    const clean = input.trim();
    if (!clean) return null;

    let testString = clean;

    // Try to fix raw numbers based on context
    // Check if it already has a function wrapper
    const hasWrapper = /^[a-z]+\(/.test(clean);

    // Check for raw hex (3, 4, 6, 8 chars)
    if (/^[0-9A-Fa-f]{3,8}$/.test(clean)) {
        testString = '#' + clean;
    } else if (!hasWrapper && !clean.startsWith('#')) {
        // Assume raw numbers
        if (contextFormat === 'rgb') {
             // 255 255 255 or 255, 255, 255
             testString = `rgb(${clean})`;
        } else if (contextFormat === 'hsl') {
             testString = `hsl(${clean})`;
        } else if (contextFormat === 'oklch') {
             testString = `oklch(${clean})`;
        }
    }

    const div = document.createElement('div');
    div.style.color = testString;
    // Check if valid
    if (!div.style.color) return null; // Invalid color

    // Browser converts everything to RGB computed style
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);

    // computed is usually "rgb(r, g, b)"
    const match = computed.match(/\d+/g);
    if (match && match.length >= 3) {
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        // Convert RGB to Hex
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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

// Returns 5 hues for: [primary, secondary, accent, good, bad]
function getHarmonyHues(baseHue: number, mode: GenerationMode): number[] {
  switch (mode) {
    // Monochrome: All same hue, contrast comes from lightness
    case 'monochrome': 
      return [baseHue, baseHue, baseHue, baseHue, baseHue];
    
    // Analogous: 5 colors spread 25° apart (spanning 100°)
    case 'analogous': 
      return [
        baseHue,
        (baseHue + 25) % 360,
        (baseHue + 50) % 360,
        (baseHue - 25 + 360) % 360,
        (baseHue - 50 + 360) % 360
      ];
    
    // Complementary: Base + complement + neighbors of each
    case 'complementary': 
      return [
        baseHue,
        (baseHue + 180) % 360,
        (baseHue + 30) % 360,
        (baseHue + 210) % 360,
        (baseHue - 30 + 360) % 360
      ];
    
    // Split-Complementary Extended: Base + split complements + accents
    case 'split-complementary': 
      return [
        baseHue,
        (baseHue + 150) % 360,
        (baseHue + 210) % 360,
        (baseHue + 30) % 360,
        (baseHue + 180) % 360
      ];
    
    // Triadic Extended: 3 main colors + 2 bridge colors
    case 'triadic': 
      return [
        baseHue,
        (baseHue + 120) % 360,
        (baseHue + 240) % 360,
        (baseHue + 60) % 360,
        (baseHue + 180) % 360
      ];
    
    // Tetradic/Square: 4 colors at 90° + 1 accent
    case 'tetradic': 
      return [
        baseHue,
        (baseHue + 90) % 360,
        (baseHue + 180) % 360,
        (baseHue + 270) % 360,
        (baseHue + 45) % 360
      ];
    
    // Compound (Warm-Cool Split): Cool primary + warm analogous opposites
    case 'compound': 
      return [
        baseHue,
        (baseHue + 165) % 360,
        (baseHue + 180) % 360,
        (baseHue + 195) % 360,
        (baseHue + 30) % 360
      ];
    
    // Triadic-Split: Triadic with one leg split
    case 'triadic-split': 
      return [
        baseHue,
        (baseHue + 120) % 360,
        (baseHue + 150) % 360,
        (baseHue + 240) % 360,
        (baseHue + 270) % 360
      ];
    
    // Default: Pentadic (5 colors evenly spaced at 72°)
    default: 
      return [
        baseHue,
        (baseHue + 72) % 360,
        (baseHue + 144) % 360,
        (baseHue + 216) % 360,
        (baseHue + 288) % 360
      ];
  }
}

// --- Theme Builder ---

export function generateTheme(
  mode: GenerationMode, 
  seedColor?: string, 
  saturationLevel: number = 0, // -5 to 5
  contrastLevel: number = 0,   // -5 to 5
  brightnessLevel: number = 0  // -5 to 5
): { light: ThemeTokens, dark: ThemeTokens, seed: string } {
  let baseHue: number;
  let baseSat = 70;
  let seedVal = 0;

  if (seedColor) {
    seedVal = getSeedValue(seedColor);
    const hsl = hexToHsl(seedColor);
    baseHue = hsl.h;
    baseSat = hsl.s;
  } else {
    // If random, generate a base hue and create a seed for consistency
    baseHue = randomHue();
    const tempSeed = hslToHex(baseHue, 50, 50);
    seedVal = getSeedValue(tempSeed);
    
    // Saturation Logic (Base randomness)
    // 0: 0% (pure grayscale)
    // 1: 15-25% (low saturation, more visible color)
    // 2: 40-50% (medium saturation)
    // 3: 65-75% (high saturation)
    // 4: 90-100% (maximum saturation)
    const satRandom = seededRandom(seedVal + 1);
    
    if (mode === 'random') {
        // Base Saturation mapping for random generation
        // Normal (0) -> ~60
        // -5 -> 0 (Grayscale)
        // +5 -> 95 (Vivid)
        const satNorm = saturationLevel + 5; // 0 to 10
        const randVariation = Math.floor(satRandom * 20); // 0-20 variation
        
        if (saturationLevel === -5) {
            baseSat = 0;
        } else {
            // Map 0-10 scale to roughly 0-100 range
            baseSat = (satNorm * 9) + randVariation; 
        }
    }
  }
  
  let hues: number[];
  if (mode === 'random') {
    // Random mode picks a random color harmony for color-theory-based generation
    const harmonyModes: GenerationMode[] = [
      'analogous',
      'complementary', 
      'split-complementary',
      'triadic',
      'tetradic',
      'compound',
      'triadic-split'
    ];
    const randomHarmonyIndex = Math.floor(seededRandom(seedVal + 10) * harmonyModes.length);
    const selectedHarmony = harmonyModes[randomHarmonyIndex];
    hues = getHarmonyHues(baseHue, selectedHarmony);
  } else {
    hues = getHarmonyHues(baseHue, mode);
  }

  const primaryHue = hues[0];
  const secondaryHue = hues[1];
  const accentHue = hues[2];
  let goodHue = hues[3];
  let badHue = hues[4];

  // Prefer colors closer to semantic expectations:
  // - Good should be closer to green (hue ~120)
  // - Bad should be closer to red (hue ~0 or 360)
  const distanceToHue = (hue: number, target: number) => {
    return Math.min(Math.abs(hue - target), 360 - Math.abs(hue - target));
  };
  
  const goodDistToGreen = distanceToHue(goodHue, 120);
  const goodDistToRed = distanceToHue(goodHue, 0);
  const badDistToGreen = distanceToHue(badHue, 120);
  const badDistToRed = distanceToHue(badHue, 0);
  
  // Swap if bad is closer to green than good, or good is closer to red than bad
  if (badDistToGreen < goodDistToGreen || goodDistToRed < badDistToRed) {
    [goodHue, badHue] = [badHue, goodHue];
  }

  // Adjust Primary Saturation based on level (-5 to 5)
  // -5: Grayscale (0)
  // 0: Medium (50-70)
  // +5: Vivid (90-100)
  
  let primarySat = baseSat;
  
  // Calculate specific min/max bounds based on saturation level
  // Map -5 to 5 range to 0 to 100 saturation bands
  // Level -> Min Sat
  // -5 -> 0
  // 0 -> 40
  // 5 -> 90
  const satLevelIndex = saturationLevel + 5; // 0 to 10
  
  const getMinSat = (lvl: number) => {
      if (lvl <= 0) return 0; // -5
      return Math.min(90, lvl * 9); 
  };
  const getMaxSat = (lvl: number) => {
      if (lvl <= 0) return 0;
      return Math.min(100, (lvl * 9) + 20);
  };

  const sMin = getMinSat(satLevelIndex);
  const sMax = getMaxSat(satLevelIndex);

  primarySat = clamp(baseSat, sMin, sMax);

  let secondarySat = mode === 'monochrome' ? clamp(baseSat - 30, 0, sMax - 20) : clamp(baseSat - 10, sMin, sMax);
  let accentSat = mode === 'monochrome' ? clamp(baseSat + 10, sMin, sMax) : clamp(baseSat + 10, sMin, sMax);
  let goodSat = clamp(baseSat, sMin, sMax);
  let badSat = clamp(baseSat, sMin, sMax);

  // --- Brightness Level Logic (-5 to 5 scale) ---
  // Level -5 (Dim): Compresses toward dark
  // Level 0 (Normal): Equal headroom
  // Level +5 (Bright): Compresses toward bright
  
  // Map -5 to 5 -> 0 to 1 for interpolation or direct lookups
  // For simplicity, we'll map to indices or continuous values
  
  // Background Lightness Adjustments
  // Normal Light Bg = 96 (Headroom from white)
  // Normal Dark Bg = 10 (Headroom from black)
  // Contrast Level (-5 to +5) affects these anchors:
  // +5: Push to 100 / 0
  // -5: Pull to 92 / 18
  
  let lightBase = 96; 
  let darkBase = 10;
  
  // Apply Contrast to Base Backgrounds
  // Positive contrast expels bg outward
  // Negative contrast pulls bg inward (grayer)
  if (contrastLevel > 0) {
      // 0 to 5 -> 96 to 100
      lightBase = 96 + (contrastLevel * 0.8);
      // 0 to 5 -> 10 to 0
      darkBase = 10 - (contrastLevel * 2); 
  } else {
      // 0 to -5 -> 96 to 92
      lightBase = 96 + (contrastLevel * 0.8);
      // 0 to -5 -> 10 to 18
      darkBase = 10 - (contrastLevel * 1.6);
  }

  let lightBgL = lightBase;
  let darkBgL = darkBase;
  
  if (brightnessLevel < 0) {
      // Dimming: Light becomes darker, Dark becomes darker (crushed)
      lightBgL = lightBase - (Math.abs(brightnessLevel) * 7); 
      darkBgL = Math.max(0, darkBase - (Math.abs(brightnessLevel) * 1)); 
  } else {
      // Brightening: Light becomes white, Dark becomes lighter
      lightBgL = Math.min(100, lightBase + (brightnessLevel * 0.8));
      darkBgL = darkBase + (brightnessLevel * 5); 
  }

  // --- Dynamic Range (Contrast) Logic (-5 to 5) ---
  // -5: Low Contrast (Text closer to BG)
  // 0: Normal
  // +5: High Contrast (Text furthest from BG)
  
  // Base text offsets from BG
  const baseLightTextOffset = 65; // Black text on white
  const baseDarkTextOffset = 70;  // White text on black
  
  const contrastFactor = 1 + (contrastLevel * 0.1); // 0.5 to 1.5 multiplier
  
  const lightTextL = clamp(lightBgL - (baseLightTextOffset * contrastFactor), 5, 90);
  const darkTextL = clamp(darkBgL + (baseDarkTextOffset * contrastFactor), 15, 98);
  
  // Base Color Lightness Modifiers (how "poppy" the colors are against bg)
  // Modulate based on brightness and contrast
  const baseLightColorMod = 46;
  const baseDarkColorMod = 50; // Matched richness to light mode
  
  // Shift color lightness based on brightness compression
  const brightnessShift = brightnessLevel * 3; // -15 to +15
  
  // Contrast also affects color lightness (Dynamic Range)
  // High contrast = Darker colors in Light Mode, Lighter colors in Dark Mode (more distance from BG)
  // Low contrast = Lighter colors in Light Mode, Darker colors in Dark Mode (less distance from BG)
  // contrastLevel is -5 to 5.
  const contrastShiftLight = contrastLevel * -2; // Higher contrast -> Darker color
  const contrastShiftDark = contrastLevel * 2;   // Higher contrast -> Lighter color
  
  const lightColorMod = clamp(baseLightColorMod + brightnessShift + contrastShiftLight, 30, 70);
  const darkColorMod = clamp(baseDarkColorMod + brightnessShift + contrastShiftDark, 35, 80);

  // Random variance to background saturation if tinted
  const rnd = seededRandom(seedVal + 4);
  const isTinted = rnd > 0.5 && saturationLevel > -3; // Don't tint if very desaturated
  const bgSat = isTinted ? Math.floor(seededRandom(seedVal + 5) * ((saturationLevel + 5) * 1.5)) : Math.floor(seededRandom(seedVal + 5) * 3);

  // Surface Logic - relative to bg
  const lightSurfOffset = 2 + (Math.abs(brightnessLevel - 5) * 0.5); // Slight variance
  const darkSurfOffset = 4 + (brightnessLevel * 0.5); 
  
  const lightSurfL = clamp(lightBgL - lightSurfOffset, 0, 100);
  // Dark surface usually lighter than bg
  const darkSurfL = clamp(darkBgL + 5 + (contrastLevel * 0.5), 0, 100); 

  // Generate Tokens with brightness applied to ALL colors
  // applyBrightness shifts lightness proportionally based on distance from 50% gray
  const light: ThemeTokens = {
    bg: hslToHex(primaryHue, bgSat, applyBrightness(lightBgL, brightnessLevel)), 
    card: hslToHex(primaryHue, bgSat, applyBrightness(Math.min(100, lightSurfL), brightnessLevel)),
    card2: hslToHex(primaryHue, bgSat, applyBrightness(Math.min(100, lightSurfL - 3), brightnessLevel)),
    text: hslToHex(primaryHue, 10, applyBrightness(lightTextL, brightnessLevel)), 
    textMuted: hslToHex(primaryHue, 10, applyBrightness(lightTextL + 30, brightnessLevel)),
    // textOnColor: High lightness, but saturation follows slider. 
    // If contrast is low (-5), reduce lightness slightly to be softer? No, usually text on color needs high contrast.
    // Dynamic textOnColor: Flip to dark if primary is too light
    textOnColor: applyBrightness(lightColorMod, brightnessLevel) > 65 
      ? hslToHex(primaryHue, Math.max(0, (saturationLevel + 5) * 2), 10) // Dark text for light buttons
      : hslToHex(primaryHue, Math.max(0, (saturationLevel + 5) * 2), 98), // Light text for dark buttons
    
    primary: hslToHex(primaryHue, primarySat, applyBrightness(lightColorMod, brightnessLevel)), 
    primaryFg: '#ffffff', 
    
    // Secondary: distinct color for UI elements in light mode
    secondary: mode === 'monochrome' 
      ? hslToHex(secondaryHue, 10, applyBrightness(Math.min(lightColorMod + 20, 80), brightnessLevel)) 
      : hslToHex(secondaryHue, secondarySat, applyBrightness(Math.min(lightColorMod + 10, 75), brightnessLevel)),
      
    secondaryFg: hslToHex(secondaryHue, 40, applyBrightness(lightTextL, brightnessLevel)),
    
    accent: hslToHex(accentHue, accentSat, applyBrightness(lightColorMod + 5, brightnessLevel)),
    accentFg: '#ffffff',
    
    border: hslToHex(primaryHue, 10, applyBrightness(lightBgL - 10, brightnessLevel)),
    ring: hslToHex(primaryHue, 60, applyBrightness(60, brightnessLevel)),
    
    // Good, Warn, Bad: Use harmony colors directly from 5-color palette
    good: hslToHex(goodHue, goodSat, applyBrightness(Math.max(lightColorMod - 5, 40), brightnessLevel)),
    goodFg: '#ffffff',
    warn: hslToHex(accentHue, accentSat, applyBrightness(Math.max(lightColorMod, 45), brightnessLevel)),
    warnFg: '#ffffff',
    bad: hslToHex(badHue, badSat, applyBrightness(Math.max(lightColorMod + 5, 50), brightnessLevel)),
    badFg: '#ffffff'
  };

  const dark: ThemeTokens = {
    bg: hslToHex(primaryHue, bgSat, applyBrightness(darkBgL, brightnessLevel)), 
    card: hslToHex(primaryHue, bgSat, applyBrightness(darkSurfL, brightnessLevel)), 
    card2: hslToHex(primaryHue, bgSat, applyBrightness(darkSurfL + 5, brightnessLevel)),
    text: hslToHex(primaryHue, 10, applyBrightness(darkTextL, brightnessLevel)),
    textMuted: hslToHex(primaryHue, 10, applyBrightness(darkTextL - 30, brightnessLevel)),
    // Dynamic textOnColor: Flip to dark if primary is too light (rare in dark mode but possible at max brightness)
    textOnColor: applyBrightness(darkColorMod, brightnessLevel) > 65
      ? hslToHex(primaryHue, Math.max(0, (saturationLevel + 5) * 2), 10)
      : hslToHex(primaryHue, Math.max(0, (saturationLevel + 5) * 2), 98),
    
    primary: hslToHex(primaryHue, primarySat, applyBrightness(darkColorMod, brightnessLevel)),
    primaryFg: '#ffffff',
    
    // Secondary: brighter for better readability in dark mode
    secondary: hslToHex(secondaryHue, secondarySat, applyBrightness(Math.max(darkColorMod - 10, 40), brightnessLevel)), 
    secondaryFg: hslToHex(secondaryHue, 40, applyBrightness(darkTextL, brightnessLevel)),
    
    accent: hslToHex(accentHue, accentSat, applyBrightness(darkColorMod + 5, brightnessLevel)),
    accentFg: '#ffffff',
    
    border: hslToHex(primaryHue, 15, applyBrightness(darkBgL + 12, brightnessLevel)),
    ring: hslToHex(primaryHue, 60, applyBrightness(60, brightnessLevel)),
    
    // Good, Warn, Bad: Use harmony colors directly from 5-color palette
    good: hslToHex(goodHue, goodSat, applyBrightness(Math.max(darkColorMod - 10, 35), brightnessLevel)),
    goodFg: '#ffffff',
    warn: hslToHex(accentHue, accentSat, applyBrightness(Math.max(darkColorMod - 5, 40), brightnessLevel)),
    warnFg: '#ffffff',
    bad: hslToHex(badHue, badSat, applyBrightness(Math.max(darkColorMod, 45), brightnessLevel)),
    badFg: '#ffffff'
  };

  return { light, dark, seed: seedColor || hslToHex(baseHue, baseSat, 50) };
}

// Convert image to dominant color (very basic implementation)
export async function extractColorFromImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("No context");
        
        canvas.width = 50; // resize for performance
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r=0, g=0, b=0, count=0;
        
        for (let i = 0; i < data.length; i += 4 * 10) { // sample every 10th pixel
           r += data[i];
           g += data[i+1];
           b += data[i+2];
           count++;
        }
        
        r = Math.floor(r/count);
        g = Math.floor(g/count);
        b = Math.floor(b/count);
        
        const hsl = rgbToHsl(r, g, b);
        resolve(hslToHex(hsl.h, hsl.s, hsl.l));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}