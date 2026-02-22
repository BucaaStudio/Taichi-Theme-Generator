/**
 * Contrast and Accessibility Utility Module
 * Implements WCAG contrast ratio calculations
 * Version: 25.12.2
 */

import { OklchColor, toOklch, toHex, hexToRgb, clampToSRGBGamut } from './oklch';

// --- Luminance Calculation ---

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return getRelativeLuminance(r, g, b);
}

// --- Contrast Ratio ---

export function contrastRatio(fg: string, bg: string): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastRatioOklch(fg: OklchColor, bg: OklchColor): number {
  return contrastRatio(toHex(fg), toHex(bg));
}

// --- WCAG Compliance ---

export type WCAGLevel = 'AAA' | 'AA' | 'A' | 'fail';

export function checkWCAGLevel(ratio: number, isLargeText: boolean = false): WCAGLevel {
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3) return 'AA';
    return 'fail';
  } else {
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'A';
    return 'fail';
  }
}

export function meetsWCAG(fg: string, bg: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const ratio = contrastRatio(fg, bg);
  return level === 'AAA' ? ratio >= 7 : ratio >= 4.5;
}

// --- Foreground Color Selection ---

export function selectForeground(
  bg: OklchColor,
  _preferLight: boolean = true,
  targetRatio: number = 4.5
): OklchColor {
  const bgHex = toHex(bg);

  // Determine direction: light or dark foreground
  const whiteRatio = contrastRatio('#ffffff', bgHex);
  const blackRatio = contrastRatio('#000000', bgHex);
  const goLight = whiteRatio >= blackRatio;

  // Themed tint: carry the bg's hue with visible chroma instead of pure B/W.
  // Floor of 0.035 ensures even neutralish backgrounds produce tinted fg.
  const tintC = Math.max(0.035, Math.min(bg.C * 0.8, 0.09));

  // Try tinted candidate first — start well away from pure white/black and
  // nudge toward the extreme only if contrast is insufficient
  let L = goLight ? 0.88 : 0.22;
  const step = goLight ? 0.02 : -0.02;

  for (let i = 0; i < 25; i++) {
    const candidate = clampToSRGBGamut({ L, C: tintC, H: bg.H });
    if (contrastRatio(toHex(candidate), bgHex) >= targetRatio) {
      return candidate;
    }
    L = Math.max(0.03, Math.min(0.97, L + step));
  }

  // Final fallback: near-white or near-black with tint first.
  // If even that cannot hit targetRatio, use pure achromatic white/black as
  // a guaranteed contrast fallback.
  const tintedExtreme = goLight
    ? clampToSRGBGamut({ L: 0.97, C: tintC, H: bg.H })
    : clampToSRGBGamut({ L: 0.05, C: tintC, H: bg.H });
  if (contrastRatio(toHex(tintedExtreme), bgHex) >= targetRatio) {
    return tintedExtreme;
  }

  const pureLight = { L: 0.999, C: 0, H: bg.H };
  const pureDark = { L: 0.001, C: 0, H: bg.H };
  const lightRatio = contrastRatio(toHex(pureLight), bgHex);
  const darkRatio = contrastRatio(toHex(pureDark), bgHex);
  return lightRatio >= darkRatio ? pureLight : pureDark;
}

export function selectForegroundHex(bgHex: string): string {
  const bg = toOklch(bgHex);
  return toHex(selectForeground(bg));
}

// --- Contrast Enhancement ---

export function adjustForContrast(
  fg: OklchColor,
  bg: OklchColor,
  minRatio: number = 4.5
): OklchColor {
  const bgHex = toHex(bg);
  const step = 0.02;
  const maxSteps = 48;

  const search = (direction: 1 | -1) => {
    let candidate = { ...fg };
    let best = clampToSRGBGamut(candidate);
    let bestRatio = contrastRatio(toHex(best), bgHex);

    for (let i = 0; i < maxSteps; i++) {
      candidate.L = Math.max(0.001, Math.min(0.999, candidate.L + direction * step));
      const clamped = clampToSRGBGamut(candidate);
      const ratio = contrastRatio(toHex(clamped), bgHex);
      if (ratio > bestRatio) {
        best = clamped;
        bestRatio = ratio;
      }
      if (ratio >= minRatio) {
        return { color: clamped, ratio, met: true };
      }
      if (clamped.L <= 0.001 || clamped.L >= 0.999) break;
    }

    return { color: best, ratio: bestRatio, met: false };
  };

  const up = search(1);
  const down = search(-1);
  const base = clampToSRGBGamut(fg);
  const deltaUp = Math.abs(up.color.L - base.L);
  const deltaDown = Math.abs(down.color.L - base.L);

  if (up.met && down.met) {
    return deltaUp <= deltaDown ? up.color : down.color;
  }
  if (up.met) return up.color;
  if (down.met) return down.color;
  return up.ratio >= down.ratio ? up.color : down.color;
}

// --- Contrast Headroom ---

export function getContrastHeadroom(fg: string, bg: string): number {
  const ratio = contrastRatio(fg, bg);
  // How much above the 4.5:1 minimum (0 = exactly at minimum, positive = extra)
  return ratio - 4.5;
}

// --- Batch Validation ---

export interface ContrastPair {
  fg: string;
  bg: string;
  name: string;
}

export interface ContrastValidation {
  pair: ContrastPair;
  ratio: number;
  level: WCAGLevel;
  passes: boolean;
}

export function validateContrasts(
  pairs: ContrastPair[],
  minRatio: number = 4.5
): ContrastValidation[] {
  return pairs.map((pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg);
    return {
      pair,
      ratio,
      level: checkWCAGLevel(ratio),
      passes: ratio >= minRatio,
    };
  });
}

export function allContrastsPass(
  pairs: ContrastPair[],
  minRatio: number = 4.5
): boolean {
  return validateContrasts(pairs, minRatio).every((v) => v.passes);
}
