import { ThemeTokens, GenerationMode, ColorFormat, LockedColors } from '../types.js';
import {
  generateTheme as paletteEngineGenerateTheme,
  mintSeedHex,
  seedFromHue,
  resolveHarmonyMode,
} from './paletteEngine.js';
import { toOklch, toHex, clampToSRGBGamut, rgbToHex, hueDifference } from './oklch.js';
import { selectForeground, selectForegroundHex, contrastRatio, adjustForContrast } from './contrast.js';
import { evaluateDualPalette, selectBestPalette, type PaletteCandidate, type ScoredPalette } from './scoringEngine.js';

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
 * - HSL: hsl(0,0%,0%), 200 50 40 (when format is hsl)
 * - OKLCH: oklch(0.5 0.15 180), 0.500 0.150 180.0 (when format is oklch)
 */
export function parseToHex(input: string, format?: ColorFormat): string | null {
  input = input.trim().toLowerCase();

  const fromHex = (): string | null => {
    const hexMatch = input.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
    if (!hexMatch) return null;
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    return '#' + hex;
  };

  const fromRgb = (): string | null => {
    const rgbValues = input.match(/(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/);
    if (!rgbValues) return null;
    const r = parseInt(rgbValues[1], 10);
    const g = parseInt(rgbValues[2], 10);
    const b = parseInt(rgbValues[3], 10);
    if (r <= 255 && g <= 255 && b <= 255) {
      return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    return null;
  };

  const fromHsl = (): string | null => {
    const hslValues = input.match(/(-?[\d.]+)[,\s]+([\d.]+)%?[,\s]+([\d.]+)%?/);
    if (!hslValues) return null;
    const h = parseFloat(hslValues[1]);
    const s = parseFloat(hslValues[2]);
    const l = parseFloat(hslValues[3]);
    if (h >= 0 && h <= 360 && s <= 100 && l <= 100) {
      return hslToHex(h, s, l);
    }
    return null;
  };

  const fromOklch = (): string | null => {
    const match =
      input.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/) ||
      input.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/);
    if (!match) return null;
    const L = parseFloat(match[1]);
    const C = parseFloat(match[2]);
    const H = parseFloat(match[3]);
    if (![L, C, H].every(Number.isFinite)) return null;
    const lightness = L > 1 && L <= 100 ? L / 100 : L;
    return toHex(clampToSRGBGamut({ L: lightness, C, H }));
  };

  const hex = fromHex();
  if (hex) return hex;

  // Honor the active swatch format first so compact HSL/OKLCH values
  // are not misread as RGB (e.g. "200 50 40").
  if (format === 'hsl' || input.includes('hsl')) {
    const parsed = fromHsl();
    if (parsed) return parsed;
  }
  if (format === 'oklch' || input.includes('oklch')) {
    const parsed = fromOklch();
    if (parsed) return parsed;
  }
  if (format === 'rgb' || input.includes('rgb')) {
    const parsed = fromRgb();
    if (parsed) return parsed;
  }

  return fromRgb() || fromHsl() || fromOklch();
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

/** WCAG AA at defaults (4.5 / 3.0). Negative contrast lowers floors continuously. */
export function readabilityFloors(contrast: number, isDark: boolean): { text: number; muted: number } {
  if (contrast >= 0) {
    return { text: 4.5, muted: 3.0 };
  }
  const factor = Math.pow(2, contrast * 0.22);
  return {
    text: Math.max(isDark ? 2.6 : 2.4, 4.5 * factor),
    muted: Math.max(isDark ? 2.0 : 1.8, 3.0 * factor),
  };
}

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

  const finalizeAdjustedTokens = (
    adjusted: Record<string, string>,
    contrastForReadability: number,
    desiredOccupancy?: Record<string, number>
  ): ThemeTokens => {
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
    const { text: textMinRatio, muted: mutedMinRatio } = readabilityFloors(contrastForReadability, isDarkTheme);

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

      // Contrast fitting moves lightness into a narrower gamut slice, which
      // flattens the saturation slider for luminance-bright hues (yellow-greens
      // converge to one constrained color at every saturation setting). Restore
      // the slider's intended gamut occupancy at the settled lightness, backing
      // off only if that would break the contrast floor.
      const desired = desiredOccupancy?.[key];
      if (desired !== undefined) {
        const cMax = Math.max(0.001, maxGamutChromaAt(color.L, color.H));
        const targetC = Math.min(cMax, desired * cMax);
        if (targetC > color.C + 0.001) {
          // Extra chroma adds luminance on bright hues, so pair each chroma
          // candidate with a small compensating darkening step.
          const halfC = (color.C + targetC) / 2;
          const candidates: Array<[number, number]> = [
            [color.L, targetC],
            [color.L - 0.02, targetC],
            [color.L, halfC],
            [color.L - 0.02, halfC],
          ];
          for (const [candL, candC] of candidates) {
            const boosted = clampToSRGBGamut({ L: Math.max(0.1, candL), C: candC, H: color.H });
            if (boosted.C <= color.C + 0.001) continue;
            if (getWorstSurface(toHex(boosted), surfaces).ratio >= minRatio - 0.05) {
              color = boosted;
              break;
            }
          }
        }
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

    // Preserve visual hierarchy after readability correction, then recheck
    // muted contrast so the separation nudge cannot drop it below the floor.
    ensureSeparation('textMuted', 'text', 0.06);
    enforceSurfaceContrast('textMuted', ['bg', 'card', 'card2'], mutedMinRatio);
    ensureSeparation('textMuted', 'text', 0.04);

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
  // Surfaces must never cross the light/dark midline: a dark theme whose bg
  // brightens past L≈0.5 flips the readability guardrails into light-theme
  // mode and text polarity inverts mid-slider.
  const surfaceKeys = new Set(['bg', 'card', 'card2']);
  const isDarkSource = toOklch(tokens.bg).L < 0.5;
  const satNorm = Math.max(-1, Math.min(1, saturation / 5));
  const desiredOccupancy: Record<string, number> = {};
  for (const key of allKeys) {
    const isChromatic = chromaticKeys.has(key);
    const isSurface = surfaceKeys.has(key);
    let L = midpoint + (brightened[key].L - midpoint) * contrastFactor;
    // Keep chromatic tokens away from pure black/white, even at high contrast,
    // so hue identity does not collapse to achromatic output.
    let minL = isChromatic ? (isLightTheme ? 0.12 : 0.10) : 0.03;
    let maxL = isChromatic ? (isLightTheme ? 0.92 : 0.90) : 0.97;
    if (isSurface) {
      if (isDarkSource) maxL = Math.min(maxL, 0.45);
      else minL = Math.max(minL, 0.55);
    }
    L = Math.max(minL, Math.min(maxL, L));
    let C: number;
    if (isChromatic) {
      // Saturation works on relative gamut occupancy: a plain chroma multiplier
      // dies against the sRGB clamp near the top (steps +3..+5 become invisible,
      // earliest for hues that generate near their gamut limit). Interpolating
      // occupancy toward a 0.97 ceiling keeps every step equally visible and
      // hue-balanced; the negative side scales multiplicatively toward gray.
      // High positive saturation also nudges lightness toward the hue's chroma
      // cusp, buying headroom where the gamut is narrow (greens, teals).
      if (satNorm > 0) {
        let cuspL = L;
        let cuspC = 0;
        for (let l = 0.35; l <= 0.78; l += 0.05) {
          const c = maxGamutChromaAt(l, brightened[key].H);
          if (c > cuspC) {
            cuspC = c;
            cuspL = l;
          }
        }
        L = Math.max(minL, Math.min(maxL, L + (cuspL - L) * satNorm * 0.12));
      }
      const cMax = Math.max(0.001, maxGamutChromaAt(L, brightened[key].H));
      const rel = Math.min(1, brightened[key].C / cMax);
      const relOut = satNorm >= 0
        ? rel + Math.max(0, 0.97 - rel) * satNorm * 0.85
        : rel * (1 + satNorm * 0.94);
      desiredOccupancy[key] = relOut * contrastChromaFactor;
      C = Math.max(0.008, relOut * cMax * contrastChromaFactor);
    } else {
      C = Math.max(0.008, brightened[key].C * satFactor * contrastChromaFactor);
    }
    adjusted[key] = toHex(clampToSRGBGamut({ L, C, H: brightened[key].H }));
  }

  return finalizeAdjustedTokens(adjusted, contrast, desiredOccupancy);
}

interface ParityOptions {
  strength?: number;
}

function tokenSurfaceContrast(theme: ThemeTokens, key: keyof ThemeTokens): number {
  const token = theme[key];
  const bgRatio = contrastRatio(token, theme.bg);
  const cardRatio = contrastRatio(token, theme.card);
  return Math.min(bgRatio, cardRatio);
}

function fitContrastTowardTarget(
  color: { L: number; C: number; H: number },
  bgHex: string,
  targetRatio: number
): { L: number; C: number; H: number } {
  const bg = toOklch(bgHex);
  const base = clampToSRGBGamut(color);
  const baseHex = toHex(base);
  const baseRatio = contrastRatio(baseHex, bgHex);
  if (!Number.isFinite(targetRatio) || targetRatio <= 0 || Math.abs(baseRatio - targetRatio) < 0.02) {
    return base;
  }

  // Move along the lightness axis only. This keeps hue/chroma identity stable.
  const increaseContrast = baseRatio < targetRatio;
  const boundaryL = increaseContrast ? (base.L >= bg.L ? 0.97 : 0.03) : bg.L;

  let best = base;
  let bestDelta = Math.abs(baseRatio - targetRatio);

  // Fixed sampling is robust to gamut warping and avoids oscillation.
  for (let i = 1; i <= 48; i++) {
    const t = i / 48;
    const sampled = clampToSRGBGamut({
      L: base.L + (boundaryL - base.L) * t,
      C: base.C,
      H: base.H,
    });
    const ratio = contrastRatio(toHex(sampled), bgHex);
    const delta = Math.abs(ratio - targetRatio);
    if (delta < bestDelta) {
      best = sampled;
      bestDelta = delta;
    }
  }

  return best;
}

function harmonizeSemanticContrastBetweenModes(
  light: ThemeTokens,
  dark: ThemeTokens,
  strength: number
): { light: ThemeTokens; dark: ThemeTokens } {
  const tunedLight: ThemeTokens = { ...light };
  const tunedDark: ThemeTokens = { ...dark };
  const keys = ['primary', 'secondary', 'accent', 'good', 'warn', 'bad', 'ring'] as const;
  const balance = Math.max(0, Math.min(1, strength * 0.85));
  if (balance <= 0) return { light: tunedLight, dark: tunedDark };

  // Fit against whichever surface is binding (the one producing the measured
  // worst-case ratio); fitting against bg alone under-corrects when card is
  // the limiting surface.
  const bindingSurface = (theme: ThemeTokens, key: keyof ThemeTokens): string =>
    contrastRatio(theme[key], theme.bg) <= contrastRatio(theme[key], theme.card)
      ? theme.bg
      : theme.card;

  for (const key of keys) {
    const lightRatio = tokenSurfaceContrast(tunedLight, key);
    const darkRatio = tokenSurfaceContrast(tunedDark, key);

    // Shared perceptual target:
    // - geometric mean keeps both sides moving toward each other
    // - clamped band prevents over-inked light colors and blown-out dark colors
    // - the pull strengthens with the cross-mode gap: a partial pull on an
    //   extreme gap (e.g. 18:1 vs 3:1) would still leave the modes feeling
    //   like different designs
    const sharedTarget = Math.max(2.7, Math.min(6.2, Math.sqrt(lightRatio * darkRatio)));
    const gap = Math.abs(lightRatio - darkRatio);
    const keyBalance = Math.min(1, balance + Math.max(0, (gap - 3) * 0.05));
    const targetLight = lightRatio + (sharedTarget - lightRatio) * keyBalance;
    const targetDark = darkRatio + (sharedTarget - darkRatio) * keyBalance;

    tunedLight[key] = toHex(
      fitContrastTowardTarget(toOklch(tunedLight[key]), bindingSurface(tunedLight, key), targetLight)
    );
    tunedDark[key] = toHex(
      fitContrastTowardTarget(toOklch(tunedDark[key]), bindingSurface(tunedDark, key), targetDark)
    );

    // Contrast fitting re-clamps both modes at different lightnesses, and the
    // gamut clamp tolerates a few degrees of hue bend at the sRGB edge — in
    // opposite directions per mode. Re-anchor the dark hue on light so the
    // pair never reads as two different colors.
    const lightColor = toOklch(tunedLight[key]);
    const darkColor = toOklch(tunedDark[key]);
    if (Math.min(lightColor.C, darkColor.C) >= 0.02) {
      const hueDelta = ((((lightColor.H - darkColor.H) % 360) + 540) % 360) - 180;
      if (Math.abs(hueDelta) > 1) {
        tunedDark[key] = toHex(clampToSRGBGamut({
          L: darkColor.L,
          C: darkColor.C,
          H: ((darkColor.H + hueDelta * balance) % 360 + 360) % 360,
        }));
      }
    }
  }

  // Keep foreground tokens coherent with any semantic color changes.
  tunedLight.textOnColor = selectForegroundHex(tunedLight.primary);
  tunedLight.primaryFg = selectForegroundHex(tunedLight.primary);
  tunedLight.secondaryFg = selectForegroundHex(tunedLight.secondary);
  tunedLight.accentFg = selectForegroundHex(tunedLight.accent);
  tunedLight.goodFg = selectForegroundHex(tunedLight.good);
  tunedLight.warnFg = selectForegroundHex(tunedLight.warn);
  tunedLight.badFg = selectForegroundHex(tunedLight.bad);

  tunedDark.textOnColor = selectForegroundHex(tunedDark.primary);
  tunedDark.primaryFg = selectForegroundHex(tunedDark.primary);
  tunedDark.secondaryFg = selectForegroundHex(tunedDark.secondary);
  tunedDark.accentFg = selectForegroundHex(tunedDark.accent);
  tunedDark.goodFg = selectForegroundHex(tunedDark.good);
  tunedDark.warnFg = selectForegroundHex(tunedDark.warn);
  tunedDark.badFg = selectForegroundHex(tunedDark.bad);

  return { light: tunedLight, dark: tunedDark };
}

export const PALETTE_SLOT_KEYS = [
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

const IMAGE_SLOT_KEYS = PALETTE_SLOT_KEYS;

type ImageSlotKey = typeof IMAGE_SLOT_KEYS[number];

export function mergeLockedSlots(
  existing: string[] | undefined,
  locked: LockedColors | undefined,
  source: ThemeTokens | undefined
): string[] | undefined {
  const slots = existing && (existing.length === 10 || existing.length === 5)
    ? [...existing]
    : new Array(PALETTE_SLOT_KEYS.length).fill('');

  if (slots.length === 5) {
    const expanded = new Array(PALETTE_SLOT_KEYS.length).fill('');
    expanded[5] = slots[0];
    expanded[6] = slots[1];
    expanded[7] = slots[2];
    expanded[8] = slots[3];
    expanded[9] = slots[4];
    slots.length = 0;
    slots.push(...expanded);
  }

  let any = slots.some((value) => Boolean(value && String(value).trim()));
  if (source && locked) {
    PALETTE_SLOT_KEYS.forEach((key, index) => {
      if (locked[key]) {
        slots[index] = source[key];
        any = true;
      }
    });
  }

  return any ? slots : undefined;
}

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

const CANDIDATE_HUE_JITTERS = [0, -6, 6, -12, 12];
const CANDIDATE_CHROMAS = [0.11, 0.18];
const NEARBY_HARMONIES: GenerationMode[] = ['analogous', 'compound', 'split-complementary'];

function buildSearchCandidates(
  masterSeed: string,
  resolvedHarmony: GenerationMode,
  userMode: GenerationMode,
  shouldSearch: boolean
): Array<{ seed: string; mode: GenerationMode }> {
  const specs: Array<{ seed: string; mode: GenerationMode }> = [
    { seed: masterSeed, mode: resolvedHarmony },
  ];
  if (!shouldSearch) return specs;

  const hue = toOklch(masterSeed).H;
  for (const jitter of CANDIDATE_HUE_JITTERS) {
    if (jitter === 0) continue;
    specs.push({ seed: seedFromHue((hue + jitter + 360) % 360), mode: resolvedHarmony });
  }
  for (const chroma of CANDIDATE_CHROMAS) {
    specs.push({ seed: seedFromHue(hue, chroma), mode: resolvedHarmony });
  }
  if (userMode === 'random') {
    for (const nearby of NEARBY_HARMONIES) {
      if (nearby !== resolvedHarmony) {
        specs.push({ seed: masterSeed, mode: nearby });
      }
    }
  }
  return specs;
}

function toScoreCandidate(tokens: ThemeTokens): PaletteCandidate {
  return {
    bg: tokens.bg,
    card: tokens.card,
    text: tokens.text,
    textMuted: tokens.textMuted,
    primary: tokens.primary,
    secondary: tokens.secondary,
    accent: tokens.accent,
    good: tokens.good,
    bad: tokens.bad,
  };
}

function overrideLocksPrimary(overridePalette?: string[]): boolean {
  if (!overridePalette) return false;
  if (overridePalette.length === 10) return Boolean(overridePalette[5]?.trim());
  return Boolean(overridePalette[0]?.trim());
}

function finishPalettePair(
  mode: GenerationMode,
  seedColor: string,
  saturationLevel: number,
  contrastLevel: number,
  brightnessLevel: number,
  overridePalette: string[] | undefined,
  darkFirst: boolean,
  dSat: number,
  dCon: number,
  dBri: number,
  imageImportSourceSide?: 'light' | 'dark'
): { light: ThemeTokens; dark: ThemeTokens; seed: string; mode: GenerationMode } {
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
  } else {
    const contrastIntensity = Math.max(Math.abs(contrastLevel), Math.abs(dCon));
    const balanceGate = Math.max(0, contrastIntensity - 2) / 3;
    const balanceStrength = parityStrength * Math.max(0, Math.min(1, balanceGate));
    if (balanceStrength > 0.01) {
      const balanced = harmonizeSemanticContrastBetweenModes(light, dark, balanceStrength);
      light = balanced.light;
      dark = balanced.dark;
    }
  }

  return {
    light,
    dark,
    seed: base.seed,
    mode: base.mode,
  };
}

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
  const dSat = darkSaturationLevel ?? saturationLevel;
  const dCon = darkContrastLevel ?? contrastLevel;
  const dBri = darkBrightnessLevel ?? brightnessLevel;

  const masterSeed = seedColor || mintSeedHex();
  const resolvedHarmony = mode === 'image' ? 'analogous' : resolveHarmonyMode(mode, masterSeed);
  const filledSlots = overridePalette?.filter((color) => Boolean(color && color.trim())).length ?? 0;
  const shouldSearch =
    !seedColor &&
    filledSlots < 3 &&
    !overrideLocksPrimary(overridePalette) &&
    mode !== 'image';

  const candidates = buildSearchCandidates(masterSeed, resolvedHarmony, mode, shouldSearch);
  const built: Array<{ light: ThemeTokens; dark: ThemeTokens; seed: string; mode: GenerationMode }> = [];
  const scored: ScoredPalette[] = [];

  for (const candidate of candidates) {
    const finished = finishPalettePair(
      candidate.mode,
      candidate.seed,
      saturationLevel,
      contrastLevel,
      brightnessLevel,
      overridePalette,
      darkFirst,
      dSat,
      dCon,
      dBri,
      imageImportSourceSide
    );
    built.push({ ...finished, seed: candidate.seed, mode: finished.mode });
    scored.push(
      evaluateDualPalette(
        toScoreCandidate(finished.light),
        toScoreCandidate(finished.dark),
        toOklch(candidate.seed).H,
        finished.mode
      )
    );
  }

  const best = selectBestPalette(scored);
  const winnerIndex = best ? scored.indexOf(best) : 0;
  const winner = built[Math.max(0, winnerIndex)];

  return {
    light: winner.light,
    dark: winner.dark,
    seed: winner.seed,
    mode: mode === 'image' ? 'image' : winner.mode,
  };
}

interface ImageColorSample {
  hex: string;
  count: number;
  L: number;
  C: number;
  H: number;
}

function oklchToLab(color: { L: number; C: number; H: number }): { L: number; a: number; b: number } {
  const rad = (color.H * Math.PI) / 180;
  return { L: color.L, a: color.C * Math.cos(rad), b: color.C * Math.sin(rad) };
}

function labToOklch(L: number, a: number, b: number): { L: number; C: number; H: number } {
  const C = Math.sqrt(a * a + b * b);
  let H = Math.atan2(b, a) * (180 / Math.PI);
  if (H < 0) H += 360;
  return { L, C, H };
}

function labDistance(
  a: { L: number; a: number; b: number },
  b: { L: number; a: number; b: number }
): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return dL * dL + da * da + db * db;
}

export function clusterImageColors(
  samples: Array<{ hex: string; count: number }>,
  k: number = 8
): ImageColorSample[] {
  const points = samples
    .filter((sample) => sample.hex && sample.count > 0)
    .map((sample) => {
      const oklch = toOklch(sample.hex);
      return { ...oklchToLab(oklch), count: sample.count, hex: sample.hex };
    });
  if (points.length === 0) return [];

  const clusterCount = Math.min(k, points.length);
  const centroids = [points.reduce((best, point) => (point.count > best.count ? point : best))];
  const unused = points.filter((point) => point !== centroids[0]);
  while (centroids.length < clusterCount && unused.length > 0) {
    let farIndex = 0;
    let farDist = -1;
    for (let i = 0; i < unused.length; i++) {
      const dist = Math.min(...centroids.map((centroid) => labDistance(centroid, unused[i])));
      if (dist > farDist) {
        farDist = dist;
        farIndex = i;
      }
    }
    centroids.push(unused.splice(farIndex, 1)[0]);
  }

  for (let iter = 0; iter < 10; iter++) {
    const buckets: Array<typeof points> = Array.from({ length: centroids.length }, () => []);
    for (const point of points) {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centroids.length; i++) {
        const dist = labDistance(point, centroids[i]);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      buckets[best].push(point);
    }
    for (let i = 0; i < centroids.length; i++) {
      if (buckets[i].length === 0) continue;
      let wL = 0;
      let wa = 0;
      let wb = 0;
      let weight = 0;
      for (const point of buckets[i]) {
        wL += point.L * point.count;
        wa += point.a * point.count;
        wb += point.b * point.count;
        weight += point.count;
      }
      const L = wL / weight;
      const a = wa / weight;
      const b = wb / weight;
      centroids[i] = {
        L,
        a,
        b,
        count: weight,
        hex: toHex(clampToSRGBGamut(labToOklch(L, a, b))),
      };
    }
  }

  return centroids.map((centroid) => {
    const oklch = labToOklch(centroid.L, centroid.a, centroid.b);
    return {
      hex: toHex(clampToSRGBGamut(oklch)),
      count: centroid.count,
      ...oklch,
    };
  });
}

function hydrateImageColor(color: { hex: string; count?: number; L?: number; C?: number; H?: number }): ImageColorSample {
  const oklch = toOklch(color.hex);
  return {
    hex: color.hex,
    count: color.count ?? 1,
    L: color.L ?? oklch.L,
    C: color.C ?? oklch.C,
    H: color.H ?? oklch.H,
  };
}

export function assignImageSlots(
  colors: Array<{ hex: string; count?: number; L?: number; C?: number; H?: number }>,
  isDark: boolean = false
): string[] {
  const fallback = isDark
    ? ['#0f172a', '#1e293b', '#f8fafc', '#94a3b8', '#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#22c55e', '#ef4444']
    : ['#f8fafc', '#f1f5f9', '#1e293b', '#64748b', '#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#22c55e', '#ef4444'];
  const unused = colors.map(hydrateImageColor);
  if (unused.length === 0) return [...fallback];

  const take = (score: (color: ImageColorSample) => number): ImageColorSample => {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < unused.length; i++) {
      const value = score(unused[i]);
      if (value > bestScore) {
        bestScore = value;
        bestIndex = i;
      }
    }
    return unused.splice(bestIndex, 1)[0];
  };

  const chromaScore = (color: ImageColorSample) =>
    color.C * 6 + (1 - Math.abs(color.L - 0.55)) * 1.4 + Math.log(1 + color.count) * 0.25;

  const neutralBias = (color: ImageColorSample) => (color.C < 0.06 ? 3 : -color.C * 10);

  const bg = take((color) => {
    const extreme = isDark ? 1 - color.L : color.L;
    return extreme * 3 + neutralBias(color) + Math.log(1 + color.count) * 0.2;
  });
  const card = unused.length
    ? take((color) => {
        const nearBg = 1 - Math.abs(color.L - bg.L);
        const sameSide = isDark ? 1 - color.L : color.L;
        return nearBg * 2.4 + sameSide + neutralBias(color);
      })
    : bg;
  const text = unused.length
    ? take((color) => {
        const opposite = isDark ? color.L : 1 - color.L;
        return opposite * 3.2 + neutralBias(color);
      })
    : hydrateImageColor({ hex: fallback[2] });
  const textMuted = unused.length
    ? take((color) => {
        const mid = 1 - Math.abs(color.L - (text.L + bg.L) / 2);
        return mid * 2.2 + neutralBias(color);
      })
    : hydrateImageColor({ hex: fallback[3] });

  const primary = unused.length ? take(chromaScore) : hydrateImageColor({ hex: fallback[5] });
  const good = unused.length
    ? take((color) => chromaScore(color) * 0.45 + (1 - hueDifference(color.H, 140) / 180) * 3.4)
    : hydrateImageColor({ hex: fallback[8] });
  const bad = unused.length
    ? take((color) => chromaScore(color) * 0.45 + (1 - hueDifference(color.H, 25) / 180) * 3.4)
    : hydrateImageColor({ hex: fallback[9] });
  const secondary = unused.length
    ? take((color) => chromaScore(color) + Math.min(hueDifference(color.H, primary.H), 80) * 0.015)
    : hydrateImageColor({ hex: fallback[6] });
  const accent = unused.length ? take(chromaScore) : hydrateImageColor({ hex: fallback[7] });

  const textOnColorCandidates = [text, ...unused];
  const textOnColor = textOnColorCandidates.reduce((best, color) => {
    const ratio = contrastRatio(color.hex, primary.hex);
    return ratio > contrastRatio(best.hex, primary.hex) ? color : best;
  }, text);

  return [
    bg.hex,
    card.hex,
    text.hex,
    textMuted.hex,
    textOnColor.hex,
    primary.hex,
    secondary.hex,
    accent.hex,
    good.hex,
    bad.hex,
  ];
}

export async function extractPaletteFromImage(file: File, isDark: boolean = false): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No context');
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const colorCounts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        const samples = Object.entries(colorCounts).map(([key, count]) => {
          const [r, g, b] = key.split(',').map(Number);
          return { hex: rgbToHex(r, g, b), count };
        });
        const clusters = clusterImageColors(samples, 8);
        resolve(assignImageSlots(clusters, isDark));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}
