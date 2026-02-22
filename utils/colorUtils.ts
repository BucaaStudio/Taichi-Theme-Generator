import { ThemeTokens, GenerationMode, ColorFormat } from '../types';
import { generateTheme as paletteEngineGenerateTheme } from './paletteEngine';
import { toOklch, toHex, clampToSRGBGamut } from './oklch';
import { selectForeground, selectForegroundHex, contrastRatio, adjustForContrast } from './contrast';

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

// --- Color Adjustments ---
// Applied as post-processing on generated tokens with a single, coherent model:
// 1) brightness curve (gamma + lift)
// 2) contrast around dynamic midpoint
// 3) chroma scaling for saturation

/**
 * Apply Photoshop-like brightness/contrast/saturation to a theme.
 *
 * Two-pass approach:
 * 1. Apply brightness curve (gamma + additive lift)
 * 2. Compute dynamic midpoint from brightness-adjusted values
 * 3. Apply contrast scaling around that midpoint
 *
 * Contrast: Midpoint scaling — L_out = mid + (L_in - mid) * factor
 *   factor = 2^(contrast * 0.35)
 *   mid = average lightness of all brightness-adjusted tokens
 *
 * Saturation: Chroma scaling — C_out = C_in * (1 + saturation * 0.2)
 */
export function applyAdjustments(
  tokens: ThemeTokens,
  brightness: number,  // -5 to 5
  contrast: number,    // -5 to 5
  saturation: number   // -5 to 5
): ThemeTokens {
  const allKeys = [
    'bg', 'card', 'card2', 'text', 'textMuted', 'textOnColor', 'border', 'ring',
    'primary', 'secondary', 'accent', 'good', 'bad', 'warn',
    'primaryFg', 'secondaryFg', 'accentFg', 'goodFg', 'warnFg', 'badFg',
  ] as const;

  const finalizeAdjustedTokens = (adjusted: Record<string, string>, contrastForReadability: number): ThemeTokens => {
    // Verify Fg tokens still contrast against their bg; fall back to re-derivation
    // if needed. When the user has intentionally lowered contrast, scale the
    // thresholds so re-derivation doesn't undo the compression.
    //   con= 0 → floor 3:1, target 4.5:1  (normal)
    //   con=-3 → floor 1.4:1, target 2.0:1 (reduced)
    //   con=-5 → floor 1.1:1, target 1.5:1 (very flat — only fix if nearly invisible)
    const contrastFactor = Math.pow(2, contrastForReadability * 0.35);
    const fgTargetRatio = contrastForReadability >= 0 ? 4.5 : Math.max(1.5, 4.5 * contrastFactor);
    const fgFloor = contrastForReadability >= 0 ? 3 : Math.max(1.1, fgTargetRatio * 0.7);

    const fgPairs: [string, string][] = [
      ['textOnColor', 'primary'],
      ['primaryFg', 'primary'], ['secondaryFg', 'secondary'], ['accentFg', 'accent'],
      ['goodFg', 'good'], ['warnFg', 'warn'], ['badFg', 'bad'],
    ];
    const enforceForegroundPairs = () => {
      for (const [fgKey, bgKey] of fgPairs) {
        if (contrastRatio(adjusted[fgKey], adjusted[bgKey]) < fgFloor) {
          const bg = toOklch(adjusted[bgKey]);
          adjusted[fgKey] = toHex(selectForeground(bg, true, fgTargetRatio));
        }
      }
    };

    // --- Color Separation Enforcement ---
    // Ensure no two tokens share the exact same hex, and that structurally
    // related pairs (border/bg, card/bg, text/textMuted) remain distinct.
    // After heavy compression the adjustment pipeline can collapse neighbours.

    const ensureSeparation = (
      movableKey: string,
      anchorKey: string,
      minLDelta: number,
      direction?: 'lighter' | 'darker'
    ) => {
      const a = toOklch(adjusted[anchorKey]);
      const m = toOklch(adjusted[movableKey]);
      const currentDelta = m.L - a.L;
      if (Math.abs(currentDelta) >= minLDelta) return; // already separated
      // Determine nudge direction: if caller specifies, use it; else push
      // movable away from anchor in its current relative direction
      const dir = direction
        ? (direction === 'lighter' ? 1 : -1)
        : (currentDelta >= 0 ? 1 : -1);
      const targetL = Math.max(0.03, Math.min(0.97, a.L + dir * minLDelta));
      adjusted[movableKey] = toHex(clampToSRGBGamut({ L: targetL, C: m.C, H: m.H }));
    };

    // Border must be visibly distinct from bg and card
    const bgL = toOklch(adjusted.bg).L;
    const borderDir = bgL > 0.5 ? 'darker' : 'lighter'; // light theme: border darker; dark theme: border lighter
    ensureSeparation('border', 'bg', 0.06, borderDir);
    ensureSeparation('border', 'card', 0.04, borderDir);
    ensureSeparation('border', 'card2', 0.03, borderDir);

    // Card must be distinct from bg
    ensureSeparation('card', 'bg', 0.03);
    // Card2 must be distinct from card
    ensureSeparation('card2', 'card', 0.02);
    // textMuted must differ from text
    ensureSeparation('textMuted', 'text', 0.08);

    // Final dedup: if any two tokens share the exact same hex, nudge the
    // less critical one by a tiny lightness step to break the tie.
    const tokenPriority = [
      'bg', 'text', 'primary', 'card', 'border', 'card2', 'textMuted',
      'secondary', 'accent', 'good', 'bad', 'warn', 'ring', 'textOnColor',
      'primaryFg', 'secondaryFg', 'accentFg', 'goodFg', 'warnFg', 'badFg',
    ];
    const seen = new Map<string, string>(); // hex → tokenKey
    for (const key of tokenPriority) {
      const hex = adjusted[key];
      if (seen.has(hex)) {
        // Nudge this lower-priority token slightly
        const c = toOklch(hex);
        const nudge = c.L > 0.5 ? -0.02 : 0.02;
        adjusted[key] = toHex(clampToSRGBGamut({
          L: Math.max(0.03, Math.min(0.97, c.L + nudge)),
          C: c.C,
          H: c.H,
        }));
      }
      seen.set(adjusted[key], key);
    }

    // --- Readability Guardrails ---
    // Keep long-form text readable regardless of extreme slider settings.
    // Enforce contrast for text and muted text against all core surfaces.
    const getWorstSurface = (
      fgHex: string,
      bgKeys: Array<'bg' | 'card' | 'card2'>
    ): { key: 'bg' | 'card' | 'card2'; ratio: number } => {
      let worstKey: 'bg' | 'card' | 'card2' = bgKeys[0];
      let worstRatio = Number.POSITIVE_INFINITY;
      for (const bgKey of bgKeys) {
        const ratio = contrastRatio(fgHex, adjusted[bgKey]);
        if (ratio < worstRatio) {
          worstRatio = ratio;
          worstKey = bgKey;
        }
      }
      return { key: worstKey, ratio: worstRatio };
    };

    const enforceSurfaceContrast = (
      fgKey: 'text' | 'textMuted',
      bgKeys: Array<'bg' | 'card' | 'card2'>,
      minRatio: number
    ) => {
      let fg = toOklch(adjusted[fgKey]);
      for (let i = 0; i < 10; i++) {
        const fgHex = toHex(fg);
        const { key: worstKey, ratio: worstRatio } = getWorstSurface(fgHex, bgKeys);
        if (worstRatio >= minRatio) break;
        fg = adjustForContrast(fg, toOklch(adjusted[worstKey]), minRatio);
      }
      let fgHex = toHex(fg);
      const post = getWorstSurface(fgHex, bgKeys);
      if (post.ratio < minRatio) {
        // Achromatic extremes are still needed as a final shared-surfaces rescue
        // when no tinted foreground can satisfy all surfaces simultaneously.
        const achromaticLight = toHex({ L: 0.999, C: 0, H: toOklch(adjusted.bg).H });
        const achromaticDark = toHex({ L: 0.001, C: 0, H: toOklch(adjusted.bg).H });
        const candidates = [
          toHex(selectForeground(toOklch(adjusted.bg), true, minRatio)),
          toHex(selectForeground(toOklch(adjusted.card), true, minRatio)),
          toHex(selectForeground(toOklch(adjusted.card2), true, minRatio)),
          achromaticLight,
          achromaticDark,
        ];
        let best = fgHex;
        let bestWorst = post.ratio;
        for (const candidate of candidates) {
          const worst = getWorstSurface(candidate, bgKeys).ratio;
          if (worst > bestWorst) {
            best = candidate;
            bestWorst = worst;
          }
        }
        fgHex = best;
      }
      adjusted[fgKey] = fgHex;
    };

    const isDarkTheme = toOklch(adjusted.bg).L < 0.5;
    const textMinRatio = isDarkTheme ? 5 : 3.8;
    const mutedMinRatio = isDarkTheme ? 3.4 : 2.6;

    enforceSurfaceContrast('text', ['bg', 'card', 'card2'], textMinRatio);
    enforceSurfaceContrast('textMuted', ['bg', 'card', 'card2'], mutedMinRatio);

    // Keep semantic chromatic tokens visible on core surfaces at brightness
    // extremes. Without this, bright light themes and very dark themes can
    // collapse accent/text contrast (e.g. primary vs bg).
    const chromaMinBase = isDarkTheme ? 2.9 : 2.8;
    // Keep semantic colors visible even when user reduces contrast heavily.
    // Negative contrast should flatten surfaces, but not erase brand/status color identity.
    const chromaVisibilityFloor = isDarkTheme ? 2.5 : 2.6;
    const chromaMinRatio = contrastForReadability >= 0
      ? chromaMinBase
      : Math.max(chromaVisibilityFloor, chromaMinBase + contrastForReadability * 0.08);

    const enforceChromaticSurfaceContrast = (
      key: 'primary' | 'secondary' | 'accent' | 'good' | 'warn' | 'bad' | 'ring',
      minRatio: number
    ) => {
      let color = toOklch(adjusted[key]);
      const surfaces: Array<'bg' | 'card' | 'card2'> = ['bg', 'card', 'card2'];
      for (let i = 0; i < 12; i++) {
        const hex = toHex(color);
        const { key: worstKey, ratio: worstRatio } = getWorstSurface(hex, surfaces);
        if (worstRatio >= minRatio) break;
        color = adjustForContrast(color, toOklch(adjusted[worstKey]), minRatio);
      }
      adjusted[key] = toHex(color);
    };

    enforceChromaticSurfaceContrast('primary', chromaMinRatio);
    enforceChromaticSurfaceContrast('secondary', chromaMinRatio);
    enforceChromaticSurfaceContrast('accent', chromaMinRatio);
    enforceChromaticSurfaceContrast('good', chromaMinRatio);
    enforceChromaticSurfaceContrast('warn', chromaMinRatio);
    enforceChromaticSurfaceContrast('bad', chromaMinRatio);
    enforceChromaticSurfaceContrast('ring', Math.max(2, chromaMinRatio - 0.3));

    // Recompute on-color text after chromatic adjustments.
    const deriveOnColorFg = (bgKey: 'primary' | 'secondary' | 'accent' | 'good' | 'warn' | 'bad'): string =>
      toHex(selectForeground(toOklch(adjusted[bgKey]), true, fgTargetRatio));
    adjusted.textOnColor = deriveOnColorFg('primary');
    adjusted.primaryFg = deriveOnColorFg('primary');
    adjusted.secondaryFg = deriveOnColorFg('secondary');
    adjusted.accentFg = deriveOnColorFg('accent');
    adjusted.goodFg = deriveOnColorFg('good');
    adjusted.warnFg = deriveOnColorFg('warn');
    adjusted.badFg = deriveOnColorFg('bad');
    enforceForegroundPairs();

    // Preserve visual hierarchy after readability correction.
    ensureSeparation('textMuted', 'text', 0.06);

    return {
      bg: adjusted.bg, card: adjusted.card, card2: adjusted.card2,
      text: adjusted.text, textMuted: adjusted.textMuted,
      border: adjusted.border, ring: adjusted.ring,
      primary: adjusted.primary, secondary: adjusted.secondary,
      accent: adjusted.accent, good: adjusted.good,
      bad: adjusted.bad, warn: adjusted.warn,
      textOnColor: adjusted.textOnColor,
      primaryFg: adjusted.primaryFg,
      secondaryFg: adjusted.secondaryFg,
      accentFg: adjusted.accentFg,
      goodFg: adjusted.goodFg,
      warnFg: adjusted.warnFg,
      badFg: adjusted.badFg,
    };
  };

  // If adjustments are neutral, skip transform math and only run guardrails.
  if (brightness === 0 && contrast === 0 && saturation === 0) {
    const adjusted: Record<string, string> = {};
    for (const key of allKeys) {
      adjusted[key] = tokens[key];
    }
    return finalizeAdjustedTokens(adjusted, contrast);
  }
  
  const brightnessNorm = Math.max(-1, Math.min(1, brightness / 5));
  const gamma = Math.pow(2, -brightness * 0.28);
  const lift = brightnessNorm * 0.14;
  const lowClip = Math.max(0, Math.min(0.2, Math.max(0, brightnessNorm) * 0.02));
  const highClip = Math.max(0.8, Math.min(1, 1 - Math.max(0, -brightnessNorm) * 0.08));

  const contrastFactor = Math.pow(2, contrast * 0.35);
  const satFactor = Math.max(0.01, 1 + saturation * 0.2);

  // Pass 1: Apply brightness (gamma + range compression), collect lightness for midpoint
  const brightened: Record<string, { L: number; C: number; H: number }> = {};
  let lightSum = 0;
  for (const key of allKeys) {
    const color = toOklch(tokens[key]);
    let L = Math.pow(Math.max(0.001, color.L), gamma) + lift;
    L = Math.max(lowClip, Math.min(highClip, L));
    brightened[key] = { L, C: color.C, H: color.H };
    lightSum += L;
  }
  const midpoint = lightSum / allKeys.length;
  const isLightTheme = brightened.bg.L > 0.5;

  // When contrast is reduced, also desaturate proportionally so chromatic
  // elements (buttons, badges) appear visually flatter — not just compressed
  // in lightness. At con=-5 this halves the remaining chroma.
  const contrastChromaFactor = contrast < 0 ? 1 + contrast * 0.1 : 1;

  // Pass 2: Apply contrast (around dynamic midpoint) and saturation.
  // Clamp L to [0.03, 0.97] so no token is ever pure #000000 or #FFFFFF;
  // enforce minimum chroma of 0.008 so even neutrals carry a slight tint.
  const adjusted: Record<string, string> = {};
  const chromaticKeys = new Set([
    'primary', 'secondary', 'accent', 'good', 'warn', 'bad', 'ring',
  ]);
  for (const key of allKeys) {
    const isChromatic = chromaticKeys.has(key);
    let L = midpoint + (brightened[key].L - midpoint) * contrastFactor;
    // Keep chromatic tokens away from pure black/white, even at high contrast,
    // so hue identity does not collapse to achromatic output.
    const minL = isChromatic ? (isLightTheme ? 0.12 : 0.10) : 0.03;
    const maxL = isChromatic ? (isLightTheme ? 0.92 : 0.90) : 0.97;
    L = Math.max(minL, Math.min(maxL, L));
    const C = Math.max(0.008, brightened[key].C * satFactor * contrastChromaFactor);
    adjusted[key] = toHex(clampToSRGBGamut({ L, C, H: brightened[key].H }));
  }

  return finalizeAdjustedTokens(adjusted, contrast);
}

interface ParityOptions {
  strength?: number;
}

const IMAGE_SLOT_KEYS = [
  'bg',
  'card',
  'text',
  'textMuted',
  'textOnColor',
  'primary',
  'secondary',
  'accent',
  'good',
  'bad',
] as const;

type ImageSlotKey = typeof IMAGE_SLOT_KEYS[number];

function parseImageOverrides(overridePalette?: string[]): Partial<Record<ImageSlotKey, string>> {
  if (!overridePalette || overridePalette.length !== IMAGE_SLOT_KEYS.length) return {};
  const mapped: Partial<Record<ImageSlotKey, string>> = {};
  for (let i = 0; i < IMAGE_SLOT_KEYS.length; i++) {
    const raw = (overridePalette[i] || '').trim();
    if (!raw) continue;
    const parsed = parseToHex(raw);
    if (parsed) mapped[IMAGE_SLOT_KEYS[i]] = parsed;
  }
  return mapped;
}

function hueMidpoint(a: number, b: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return (a + delta * 0.5 + 360) % 360;
}

function deriveThemeFromImportedSlots(
  theme: ThemeTokens,
  importedSlots: Partial<Record<ImageSlotKey, string>>
): ThemeTokens {
  const next: ThemeTokens = { ...theme };

  // 10 direct slots from image import stay exact.
  for (const key of IMAGE_SLOT_KEYS) {
    if (importedSlots[key]) {
      next[key] = importedSlots[key]!;
    }
  }

  // Remaining 10 tokens are derived from the imported foundation.
  const bg = toOklch(next.bg);
  const card = toOklch(next.card);
  const primary = toOklch(next.primary);
  const good = toOklch(next.good);
  const bad = toOklch(next.bad);

  const neutralDir = bg.L > 0.5 ? -1 : 1;
  const cardDelta = Math.abs(card.L - bg.L);
  const card2Dir = cardDelta < 0.005 ? neutralDir : (card.L >= bg.L ? 1 : -1);
  const card2Step = Math.max(0.02, Math.min(0.06, Math.max(cardDelta * 0.75, 0.03)));
  next.card2 = toHex(clampToSRGBGamut({
    L: Math.max(0.03, Math.min(0.97, card.L + card2Dir * card2Step)),
    C: card.C,
    H: card.H,
  }));

  next.border = toHex(clampToSRGBGamut({
    L: Math.max(0.03, Math.min(0.97, bg.L + neutralDir * 0.08)),
    C: Math.max(0.004, Math.max(bg.C, card.C) * 0.45),
    H: card.H,
  }));

  next.ring = toHex(clampToSRGBGamut({
    L: Math.max(0.08, Math.min(0.92, primary.L + (bg.L > 0.5 ? -0.08 : 0.08))),
    C: Math.max(0.02, primary.C * 0.85),
    H: primary.H,
  }));

  next.warn = toHex(clampToSRGBGamut({
    L: Math.max(0.08, Math.min(0.92, (good.L + bad.L) / 2 + (bg.L > 0.5 ? 0.05 : 0.08))),
    C: Math.max(0.02, (good.C + bad.C) * 0.45),
    H: hueMidpoint(good.H, bad.H),
  }));

  next.primaryFg = selectForegroundHex(next.primary);
  next.secondaryFg = selectForegroundHex(next.secondary);
  next.accentFg = selectForegroundHex(next.accent);
  next.goodFg = selectForegroundHex(next.good);
  next.warnFg = selectForegroundHex(next.warn);
  next.badFg = selectForegroundHex(next.bad);

  // Keep imported textOnColor exact when provided; otherwise derive from primary.
  if (!importedSlots.textOnColor) {
    next.textOnColor = next.primaryFg;
  }

  return next;
}

function maxGamutChromaAt(lightness: number, hue: number): number {
  const safeL = Math.max(0.001, Math.min(0.999, lightness));
  return clampToSRGBGamut({ L: safeL, C: 0.4, H: hue }).C;
}

function enforceCompanionParity(
  anchor: ThemeTokens,
  companion: ThemeTokens,
  options: ParityOptions = {}
): ThemeTokens {
  const strength = Math.max(0, Math.min(1, options.strength ?? 1));
  if (strength <= 0) return companion;

  const adjusted: ThemeTokens = { ...companion };
  const keys = ['primary', 'secondary', 'accent', 'good', 'warn', 'bad'] as const;

  for (const key of keys) {
    const anchorColor = toOklch(anchor[key]);
    const companionColor = toOklch(adjusted[key]);
    let companionL = companionColor.L;

    const sourceMax = Math.max(0.001, maxGamutChromaAt(anchorColor.L, anchorColor.H));
    let targetMax = Math.max(0.001, maxGamutChromaAt(companionL, companionColor.H));
    const sourceRelative = anchorColor.C / sourceMax;

    // If companion lightness is too close to a gamut edge for the anchor chroma,
    // nudge it toward a safer range to preserve color identity.
    const desiredIdentityC = anchorColor.C * 0.9;
    if (targetMax < desiredIdentityC) {
      if (companionL > 0.6) {
        companionL = Math.max(0.58, companionL - 0.12 * strength);
      } else if (companionL < 0.28) {
        companionL = Math.min(0.34, companionL + 0.1 * strength);
      }
      targetMax = Math.max(0.001, maxGamutChromaAt(companionL, companionColor.H));
    }

    const targetByRelative = targetMax * sourceRelative;
    const targetByAbsolute = Math.min(targetMax, anchorColor.C);
    let targetC = targetByAbsolute * 0.7 + targetByRelative * 0.3;

    // Keep chroma in a tight band around the anchor to avoid oversaturation drift.
    const lower = anchorColor.C * 0.86;
    const upper = anchorColor.C * 1.14;
    targetC = Math.max(lower, Math.min(upper, targetC));

    const blendedC = companionColor.C + (targetC - companionColor.C) * strength;

    // Hue is unstable when chroma is near zero; only enforce when meaningful.
    const hueStrength = anchorColor.C < 0.015 ? 0 : strength;
    const hueDelta = ((((anchorColor.H - companionColor.H) % 360) + 540) % 360) - 180;
    const blendedH = ((companionColor.H + hueDelta * hueStrength) % 360 + 360) % 360;

    adjusted[key] = toHex(clampToSRGBGamut({
      L: companionL,
      C: Math.max(0, blendedC),
      H: blendedH,
    }));
  }

  // Keep ring behavior tied to primary in the companion mode.
  const ring = toOklch(adjusted.ring);
  const primary = toOklch(adjusted.primary);
  adjusted.ring = toHex(clampToSRGBGamut({
    L: ring.L,
    C: Math.max(0.008, primary.C * 0.85),
    H: primary.H,
  }));

  // Recompute on-color foreground tokens for any changed chromatic tokens.
  adjusted.textOnColor = selectForegroundHex(adjusted.primary);
  adjusted.primaryFg = selectForegroundHex(adjusted.primary);
  adjusted.secondaryFg = selectForegroundHex(adjusted.secondary);
  adjusted.accentFg = selectForegroundHex(adjusted.accent);
  adjusted.goodFg = selectForegroundHex(adjusted.good);
  adjusted.warnFg = selectForegroundHex(adjusted.warn);
  adjusted.badFg = selectForegroundHex(adjusted.bad);

  return adjusted;
}

// --- Theme Builder ---

export function generateTheme(
  mode: GenerationMode,
  seedColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[],
  darkFirst: boolean = false,
  darkSaturationLevel?: number,
  darkContrastLevel?: number,
  darkBrightnessLevel?: number,
  imageImportSourceSide?: 'light' | 'dark'
): { light: ThemeTokens, dark: ThemeTokens, seed: string, mode: GenerationMode } {
  // Generate the base palette at neutral levels.
  // Brightness/contrast/saturation are applied in one adjustment stage below.
  const dSat = darkSaturationLevel ?? saturationLevel;
  const dCon = darkContrastLevel ?? contrastLevel;
  const dBri = darkBrightnessLevel ?? brightnessLevel;

  const base = paletteEngineGenerateTheme(
    mode,
    seedColor,
    0,
    0,
    0,
    overridePalette,
    darkFirst
  );
  
  let light = applyAdjustments(base.light, brightnessLevel, contrastLevel, saturationLevel);
  let dark = applyAdjustments(base.dark, dBri, dCon, dSat);

  // Final parity pass: keep semantic chroma/hue identity aligned between modes.
  // If split adjustments diverge heavily, reduce (not disable) parity influence.
  const splitDelta =
    Math.abs(saturationLevel - dSat) +
    Math.abs(contrastLevel - dCon) +
    Math.abs(brightnessLevel - dBri);
  const parityStrength = Math.max(0.35, 1 - splitDelta / 18);

  if (darkFirst) {
    light = enforceCompanionParity(dark, light, { strength: parityStrength });
  } else {
    dark = enforceCompanionParity(light, dark, { strength: parityStrength });
  }

  // Image imports: keep checked 10 slots exact on the source side.
  // The other 10 tokens are derived from those imported slots.
  const importedSlots = parseImageOverrides(overridePalette);
  if (Object.keys(importedSlots).length > 0) {
    const importSourceSide = imageImportSourceSide ?? (darkFirst ? 'dark' : 'light');
    if (importSourceSide === 'dark') {
      dark = deriveThemeFromImportedSlots(dark, importedSlots);
      light = enforceCompanionParity(dark, light, { strength: parityStrength });
    } else {
      light = deriveThemeFromImportedSlots(light, importedSlots);
      dark = enforceCompanionParity(light, dark, { strength: parityStrength });
    }
  }

  return {
    light,
    dark,
    seed: base.seed,
    mode: base.mode,
  };
}

export async function extractPaletteFromImage(file: File, isDark: boolean = false): Promise<string[]> {
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

        // Extract 10 colors matching palette structure:
        // [primary, secondary, accent, good, warn, bad, bg, card, text, border]
        const TARGET_COUNT = 10;
        const palette: string[] = [];
        const minHueDiff = 15;
        for (const c of sortedColors) {
          if (palette.length >= TARGET_COUNT) break;
          const isTooSimilar = palette.some(existingHex => {
            const extHsl = hexToHsl(existingHex);
            const hueDiff = Math.min(Math.abs(extHsl.h - c.hsl.h), 360 - Math.abs(extHsl.h - c.hsl.h));
            return hueDiff < minHueDiff && Math.abs(extHsl.s - c.hsl.s) < 15 && Math.abs(extHsl.l - c.hsl.l) < 15;
          });
          if (!isTooSimilar) palette.push(hslToHex(c.hsl.h, c.hsl.s, c.hsl.l));
        }
        if (palette.length < TARGET_COUNT) {
          for (const c of sortedColors) {
            if (palette.length >= TARGET_COUNT) break;
            const hex = hslToHex(c.hsl.h, c.hsl.s, c.hsl.l);
            if (!palette.includes(hex)) palette.push(hex);
          }
        }

        // Sort extracted colors into semantic slots by HSL properties.
        // Slot order matches palette UI: [bg, card, text, textMuted, textOnColor, primary, secondary, accent, good, bad]
        const colorObjs = palette.map(hex => ({ hex, hsl: hexToHsl(hex) }));
        const chromatic = colorObjs.filter(c => c.hsl.s > 20);
        const neutral = colorObjs.filter(c => c.hsl.s <= 20);

        // Sort chromatic by hue for diverse assignment
        chromatic.sort((a, b) => a.hsl.h - b.hsl.h);
        // Sort neutrals for semantic assignment based on mode
        // Light mode: bg=lightest, card=next, text=darkest, textMuted=mid-dark
        // Dark mode:  bg=darkest, card=next-dark, text=lightest, textMuted=mid-light
        if (isDark) {
          neutral.sort((a, b) => a.hsl.l - b.hsl.l); // darkest first
        } else {
          neutral.sort((a, b) => b.hsl.l - a.hsl.l); // lightest first
        }

        const slots: string[] = new Array(TARGET_COUNT).fill('');

        // Neutral slots: bg(0)=most extreme, card(1)=next, then assign text/textMuted
        // from the opposite end of the lightness spectrum
        if (neutral.length >= 4) {
          slots[0] = neutral[0].hex; // bg: lightest (light) or darkest (dark)
          slots[1] = neutral[1].hex; // card: next
          slots[2] = neutral[neutral.length - 1].hex; // text: opposite end
          slots[3] = neutral[neutral.length - 2].hex; // textMuted: near text
          // textOnColor(4) filled from remaining
        } else {
          for (let i = 0; i < 5 && i < neutral.length; i++) {
            slots[i] = neutral[i].hex;
          }
        }
        // Brand slots: primary(5), secondary(6), accent(7)
        for (let i = 0; i < 3 && i < chromatic.length; i++) {
          slots[5 + i] = chromatic[i].hex;
        }
        // Status slots: good(8), bad(9)
        for (let i = 0; i < 2 && i + 3 < chromatic.length; i++) {
          slots[8 + i] = chromatic[i + 3].hex;
        }

        // Fill any remaining empty slots with leftover colors
        const used = new Set(slots.filter(Boolean));
        const remaining = colorObjs.filter(c => !used.has(c.hex));
        for (let i = 0; i < TARGET_COUNT; i++) {
          if (!slots[i] && remaining.length > 0) {
            slots[i] = remaining.shift()!.hex;
          }
        }

        // Final fallback for any still-empty slots
        const fallback = isDark
          ? ['#0f172a', '#1e293b', '#f8fafc', '#94a3b8', '#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#22c55e', '#ef4444']
          : ['#f8fafc', '#f1f5f9', '#1e293b', '#64748b', '#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#22c55e', '#ef4444'];
        for (let i = 0; i < TARGET_COUNT; i++) {
          if (!slots[i]) slots[i] = fallback[i];
        }

        resolve(slots);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
