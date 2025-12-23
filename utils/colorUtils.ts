import { ThemeTokens, GenerationMode, ColorFormat } from '../types';

// --- Basic Math Helpers ---

function clamp(num: number, min: number, max: number) {
  return Math.min(Math.max(num, min), max);
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

export function formatColor(hex: string, format: ColorFormat): string {
    if (format === 'hex') return hex.toUpperCase();
    if (format === 'rgb') {
        const {r,g,b} = hexToRgb(hex);
        return `rgb(${r}, ${g}, ${b})`;
    }
    if (format === 'hsl') {
        const {h,s,l} = hexToHsl(hex);
        return `hsl(${h}, ${s}%, ${l}%)`;
    }
    if (format === 'oklch') {
        return `oklch(${hexToOklchRaw(hex)})`;
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

    if (!hasWrapper && !clean.startsWith('#')) {
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

function getHarmonyHues(baseHue: number, mode: GenerationMode): number[] {
  switch (mode) {
    case 'monochrome': return [baseHue, baseHue, baseHue];
    case 'analogous': return [baseHue, (baseHue + 30) % 360, (baseHue - 30 + 360) % 360];
    case 'complementary': return [baseHue, (baseHue + 180) % 360, baseHue]; // 3rd can be base
    case 'split-complementary': return [baseHue, (baseHue + 150) % 360, (baseHue + 210) % 360];
    case 'triadic': return [baseHue, (baseHue + 120) % 360, (baseHue + 240) % 360];
    // random: [h1, h2, h3] handled in generateTheme
    default: return [baseHue, (baseHue + 180) % 360, (baseHue + 90) % 360];
  }
}

// --- Theme Builder ---

export function generateTheme(
  mode: GenerationMode, 
  seedColor?: string, 
  saturationLevel: number = 2, 
  contrastLevel: number = 2
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
        switch(saturationLevel) {
            case 0: baseSat = 0; break; // Pure grayscale
            case 1: baseSat = Math.floor(satRandom * 10) + 15; break; // Low saturation
            case 2: baseSat = Math.floor(satRandom * 10) + 40; break; // Medium
            case 3: baseSat = Math.floor(satRandom * 10) + 65; break; // High
            case 4: baseSat = Math.floor(satRandom * 10) + 90; break; // Maximum
            default: baseSat = Math.floor(satRandom * 10) + 40;
        }
    }
  }
  
  let hues: number[];
  if (mode === 'random') {
    hues = [baseHue, randomHue(seedVal + 2), randomHue(seedVal + 3)];
  } else {
    hues = getHarmonyHues(baseHue, mode);
  }

  const primaryHue = hues[0];
  const secondaryHue = hues[1];
  const accentHue = hues[2];

  // Adjust Primary Saturation based on level (Clamping)
  // Ensure the primary color follows the slider intent strongly
  // Equal spacing: 0, 15-25, 40-50, 65-75, 90-100
  let primarySat = baseSat;
  const sMin = [0, 15, 40, 65, 90][saturationLevel];
  const sMax = [0, 25, 50, 75, 100][saturationLevel];
  primarySat = clamp(baseSat, sMin, sMax);

  let secondarySat = mode === 'monochrome' ? clamp(baseSat - 30, 0, sMax - 20) : clamp(baseSat - 10, sMin, sMax);
  let accentSat = mode === 'monochrome' ? clamp(baseSat + 10, sMin, sMax) : clamp(baseSat + 10, sMin, sMax);

  // --- Dynamic Range (Contrast) Logic ---
  // 5 Levels (1-5) with more dramatic differences for better visual distinction
  // Adjusted to ensure text is always readable, even at lowest levels
  // Level 1: Softest | Light BG: 85, Light Text: 30 | Dark BG: 30, Dark Text: 75
  // Level 2: Soft    | Light BG: 90, Light Text: 20 | Dark BG: 20, Dark Text: 82
  // Level 3: Middle  | Light BG: 95, Light Text: 18 | Dark BG: 12, Dark Text: 88
  // Level 4: High    | Light BG: 98, Light Text: 8  | Dark BG: 5,  Dark Text: 94
  // Level 5: Max     | Light BG: 100,Light Text: 0  | Dark BG: 0,  Dark Text: 100
  
  // Adjust contrast level to 0-4 index (user sees 1-5)
  const contrastIndex = contrastLevel - 1;
  
  const lightBgLevels   = [85, 90, 95, 98, 100];
  const lightTextLevels = [30, 20, 18, 8, 0];
  const darkBgLevels    = [30, 20, 12, 5, 0];
  const darkTextLevels  = [75, 82, 88, 94, 100];
  
  // Base Color Lightness Modifiers (how "poppy" the colors are against bg)
  // Lower contrast = lighter colors in light mode to blend more, darker in dark mode
  const lightColorModLevels = [58, 54, 50, 46, 42]; 
  const darkColorModLevels  = [48, 54, 60, 66, 72];

  // Random variance to background saturation if tinted
  const rnd = seededRandom(seedVal + 4);
  const isTinted = rnd > 0.5 && saturationLevel > 0;
  const bgSat = isTinted ? Math.floor(seededRandom(seedVal + 5) * (saturationLevel * 3)) : Math.floor(seededRandom(seedVal + 5) * 3);

  const lightBgL = lightBgLevels[contrastIndex];
  const lightTextL = lightTextLevels[contrastIndex];
  const darkBgL = darkBgLevels[contrastIndex];
  const darkTextL = darkTextLevels[contrastIndex];
  
  const lightColorMod = lightColorModLevels[contrastIndex];
  const darkColorMod = darkColorModLevels[contrastIndex];

  // Surface Logic
  // Light mode: Surface is slightly lighter or darker than BG depending on contrast
  // Dark mode: Surface is lighter than BG
  const lightSurfL = contrastIndex >= 3 ? 100 : Math.min(100, lightBgL + (contrastIndex === 0 ? 6 : 4));
  const darkSurfL = Math.min(100, darkBgL + (contrastIndex === 0 ? 8 : (contrastIndex === 4 ? 15 : 10))); 

  // Generate Tokens
  const light: ThemeTokens = {
    bg: hslToHex(primaryHue, bgSat, lightBgL), 
    surface: hslToHex(primaryHue, bgSat, Math.min(100, lightSurfL)),
    surface2: hslToHex(primaryHue, bgSat, Math.min(100, lightSurfL - 3)), // Surface 2 is usually darker in light mode for depth
    text: hslToHex(primaryHue, 10, lightTextL), 
    textMuted: hslToHex(primaryHue, 10, lightTextL + 30),
    
    primary: hslToHex(primaryHue, primarySat, lightColorMod), 
    primaryFg: '#ffffff', 
    
    // Secondary: affected by contrast - lighter at low contrast, more distinct at high contrast
    secondary: mode === 'monochrome' 
      ? hslToHex(secondaryHue, 10, Math.max(lightBgL - 5, 85)) 
      : hslToHex(secondaryHue, secondarySat, Math.max(lightBgL - 5, 85)),
      
    secondaryFg: hslToHex(secondaryHue, 40, lightTextL),
    
    accent: hslToHex(accentHue, accentSat, lightColorMod + 5),
    accentFg: '#ffffff',
    
    border: hslToHex(primaryHue, 10, lightBgL - 10),
    ring: hslToHex(primaryHue, 60, 60),
    
    // Success, warn, error: follow both saturation AND contrast sliders
    // At low contrast, they blend more with background; at high contrast, they're more distinct
    success: hslToHex(142, clamp(primarySat, sMin, sMax), Math.max(lightColorMod - 5, 40)), // Green hue
    successFg: '#ffffff',
    warn: hslToHex(38, clamp(primarySat, sMin, sMax), Math.max(lightColorMod, 45)), // Orange hue
    warnFg: '#ffffff',
    error: hslToHex(0, clamp(primarySat, sMin, sMax), Math.max(lightColorMod + 5, 50)), // Red hue
    errorFg: '#ffffff'
  };

  const dark: ThemeTokens = {
    bg: hslToHex(primaryHue, bgSat, darkBgL), 
    surface: hslToHex(primaryHue, bgSat, darkSurfL), 
    surface2: hslToHex(primaryHue, bgSat, darkSurfL + 5), // Lighter in dark mode
    text: hslToHex(primaryHue, 10, darkTextL),
    textMuted: hslToHex(primaryHue, 10, darkTextL - 30),
    
    primary: hslToHex(primaryHue, primarySat, darkColorMod),
    primaryFg: '#ffffff',
    
    // Secondary: affected by contrast - darker at low contrast, more distinct at high contrast
    secondary: hslToHex(secondaryHue, secondarySat, Math.min(darkBgL + 10, 30)), 
    secondaryFg: hslToHex(secondaryHue, 40, darkTextL),
    
    accent: hslToHex(accentHue, accentSat, darkColorMod + 5),
    accentFg: '#ffffff',
    
    border: hslToHex(primaryHue, 15, darkBgL + 12),
    ring: hslToHex(primaryHue, 60, 60),
    
    // Success, warn, error: follow both saturation AND contrast sliders
    // At low contrast, they blend more with background; at high contrast, they're more distinct
    success: hslToHex(142, clamp(primarySat, sMin, sMax), Math.max(darkColorMod - 10, 35)), // Green hue
    successFg: '#ffffff',
    warn: hslToHex(38, clamp(primarySat, sMin, sMax), Math.max(darkColorMod - 5, 40)), // Orange hue
    warnFg: '#ffffff',
    error: hslToHex(0, clamp(primarySat, sMin, sMax), Math.max(darkColorMod, 45)), // Red hue
    errorFg: '#ffffff'
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