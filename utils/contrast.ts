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
  preferLight: boolean = true,
  targetRatio: number = 4.5
): OklchColor {
  const bgHex = toHex(bg);
  
  // Try preferred color first
  const white = { L: 1, C: 0, H: bg.H };
  const black = { L: 0, C: 0, H: bg.H };
  
  const whiteRatio = contrastRatio('#ffffff', bgHex);
  const blackRatio = contrastRatio('#000000', bgHex);
  
  // Return the one with better contrast
  if (whiteRatio >= blackRatio && whiteRatio >= targetRatio) {
    return white;
  }
  if (blackRatio >= targetRatio) {
    return black;
  }
  
  // If neither meets target, return the better one
  return whiteRatio >= blackRatio ? white : black;
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
  let adjusted = { ...fg };
  
  // Determine direction: if fg is lighter than bg, go lighter; else darker
  const direction = fg.L > bg.L ? 1 : -1;
  
  // Iteratively adjust lightness until contrast is met
  while (contrastRatio(toHex(adjusted), bgHex) < minRatio) {
    adjusted.L += direction * 0.02;
    
    // Clamp to valid range
    if (adjusted.L <= 0.05 || adjusted.L >= 0.95) break;
  }
  
  return clampToSRGBGamut(adjusted);
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
