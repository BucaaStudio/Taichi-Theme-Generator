/**
 * Scoring and Validation Engine
 * Implements hard rejects and soft scoring for palette quality
 * Version: 25.12.2
 */

import { OklchColor, toOklch, toHex, deltaE, hueDifference, clampToSRGBGamut, isInSRGBGamut } from './oklch';
import { contrastRatio, meetsWCAG, getContrastHeadroom } from './contrast';

// --- Score Weights ---

const SCORE_WEIGHTS = {
  contrastHeadroom: 2.0,    // Extra contrast above minimum
  harmonyConsistency: 1.5,  // Colors follow harmony rules
  chromaBalance: 1.2,       // Saturation distribution
  uiUsability: 1.8,         // Practical usability
  aestheticBias: 1.0,       // Subjective quality
};

// --- Thresholds ---

export const THRESHOLDS = {
  minTextContrast: 4.5,             // WCAG AA
  minPrimaryToAccentDelta: 0.12,    // Minimum perceptual difference
  minBgToCardDelta: 0.03,           // Background vs card distinction
  dangerHueRange: { min: 350, max: 10 }, // Red-ish hues (danger zone)
  warnHueRange: { min: 35, max: 55 },    // Yellow-orange (warning zone)
};

// --- Hard Reject Checks ---

export interface RejectReason {
  code: string;
  message: string;
  severity: 'critical' | 'major';
}

export function checkHardRejects(palette: PaletteCandidate): RejectReason[] {
  const rejects: RejectReason[] = [];
  
  // 1. Text contrast check
  const textOnBgRatio = contrastRatio(palette.text, palette.bg);
  if (textOnBgRatio < THRESHOLDS.minTextContrast) {
    rejects.push({
      code: 'LOW_TEXT_CONTRAST',
      message: `Text on background contrast ${textOnBgRatio.toFixed(2)} < ${THRESHOLDS.minTextContrast}`,
      severity: 'critical',
    });
  }
  
  const textOnCardRatio = contrastRatio(palette.text, palette.card);
  if (textOnCardRatio < THRESHOLDS.minTextContrast) {
    rejects.push({
      code: 'LOW_CARD_TEXT_CONTRAST',
      message: `Text on card contrast ${textOnCardRatio.toFixed(2)} < ${THRESHOLDS.minTextContrast}`,
      severity: 'critical',
    });
  }
  
  // 2. Out-of-gamut check
  const colorKeys = ['primary', 'secondary', 'accent', 'good', 'bad'] as const;
  for (const key of colorKeys) {
    const color = toOklch(palette[key]);
    if (!isInSRGBGamut(color)) {
      rejects.push({
        code: 'OUT_OF_GAMUT',
        message: `${key} color is out of sRGB gamut`,
        severity: 'major',
      });
    }
  }
  
  // 3. Primary too close to danger/warn colors
  const primaryOklch = toOklch(palette.primary);
  const badOklch = toOklch(palette.bad);
  const primaryToBad = deltaE(primaryOklch, badOklch);
  if (primaryToBad < THRESHOLDS.minPrimaryToAccentDelta) {
    rejects.push({
      code: 'PRIMARY_LIKE_DANGER',
      message: `Primary too similar to danger color (deltaE: ${primaryToBad.toFixed(3)})`,
      severity: 'major',
    });
  }
  
  // 4. Insufficient bg/card separation
  const bgOklch = toOklch(palette.bg);
  const cardOklch = toOklch(palette.card);
  const bgCardDelta = Math.abs(bgOklch.L - cardOklch.L);
  if (bgCardDelta < THRESHOLDS.minBgToCardDelta) {
    rejects.push({
      code: 'LOW_BG_CARD_SEPARATION',
      message: `Background and card too similar (L diff: ${bgCardDelta.toFixed(3)})`,
      severity: 'major',
    });
  }
  
  // 5. Primary/accent too similar
  const accentOklch = toOklch(palette.accent);
  const primaryAccentDelta = deltaE(primaryOklch, accentOklch);
  if (primaryAccentDelta < THRESHOLDS.minPrimaryToAccentDelta) {
    rejects.push({
      code: 'PRIMARY_ACCENT_SIMILAR',
      message: `Primary and accent too similar (deltaE: ${primaryAccentDelta.toFixed(3)})`,
      severity: 'major',
    });
  }
  
  return rejects;
}

// --- Soft Scoring ---

export interface PaletteCandidate {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  good: string;
  bad: string;
}

export interface ScoreBreakdown {
  contrastHeadroom: number;
  harmonyConsistency: number;
  chromaBalance: number;
  uiUsability: number;
  aestheticBias: number;
  total: number;
}

export function scorePalette(
  palette: PaletteCandidate,
  baseHue: number
): ScoreBreakdown {
  let contrastHeadroom = 0;
  let harmonyConsistency = 0;
  let chromaBalance = 0;
  let uiUsability = 0;
  let aestheticBias = 0;
  
  // --- Contrast Headroom ---
  // More contrast = better (up to a point)
  const textBgHeadroom = getContrastHeadroom(palette.text, palette.bg);
  const textCardHeadroom = getContrastHeadroom(palette.text, palette.card);
  contrastHeadroom = Math.min(10, textBgHeadroom + textCardHeadroom);
  
  // --- Harmony Consistency ---
  // Check if accent hues follow expected patterns from base
  const primaryOklch = toOklch(palette.primary);
  const secondaryOklch = toOklch(palette.secondary);
  const accentOklch = toOklch(palette.accent);
  
  const primaryHueDiff = hueDifference(primaryOklch.H, baseHue);
  const harmonyAngles = [0, 30, 60, 90, 120, 150, 180];
  const minAngleDiff = Math.min(...harmonyAngles.map(a => Math.abs(primaryHueDiff - a)));
  harmonyConsistency = 10 - minAngleDiff / 10;
  
  // --- Chroma Balance ---
  // Balanced saturation across colors
  const chromas = [primaryOklch.C, secondaryOklch.C, accentOklch.C];
  const avgChroma = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  const chromaVariance = chromas.reduce((sum, c) => sum + Math.pow(c - avgChroma, 2), 0) / chromas.length;
  chromaBalance = 10 - Math.min(10, chromaVariance * 1000);
  
  // --- UI Usability ---
  // Primary should be prominent, muted text readable but subdued
  const primaryProminence = primaryOklch.C > 0.1 ? 5 : primaryOklch.C * 50;
  const mutedRatio = contrastRatio(palette.textMuted, palette.bg);
  const mutedBalance = mutedRatio >= 3 && mutedRatio < 7 ? 5 : 2;
  uiUsability = primaryProminence + mutedBalance;
  
  // --- Aesthetic Bias ---
  // Prefer colors that aren't too extreme
  const bgOklch = toOklch(palette.bg);
  const goodLightness = bgOklch.L > 0.9 || bgOklch.L < 0.15 ? 8 : 5;
  const goodSaturation = primaryOklch.C > 0.05 && primaryOklch.C < 0.25 ? 5 : 2;
  aestheticBias = goodLightness + goodSaturation;
  
  // --- Total with weights ---
  const total = 
    contrastHeadroom * SCORE_WEIGHTS.contrastHeadroom +
    harmonyConsistency * SCORE_WEIGHTS.harmonyConsistency +
    chromaBalance * SCORE_WEIGHTS.chromaBalance +
    uiUsability * SCORE_WEIGHTS.uiUsability +
    aestheticBias * SCORE_WEIGHTS.aestheticBias;
  
  return {
    contrastHeadroom: Math.max(0, contrastHeadroom),
    harmonyConsistency: Math.max(0, harmonyConsistency),
    chromaBalance: Math.max(0, chromaBalance),
    uiUsability: Math.max(0, uiUsability),
    aestheticBias: Math.max(0, aestheticBias),
    total: Math.max(0, total),
  };
}

// --- Palette Selection ---

export interface ScoredPalette {
  palette: PaletteCandidate;
  score: ScoreBreakdown;
  rejects: RejectReason[];
  isValid: boolean;
}

export function evaluatePalette(
  palette: PaletteCandidate,
  baseHue: number
): ScoredPalette {
  const rejects = checkHardRejects(palette);
  const score = scorePalette(palette, baseHue);
  
  return {
    palette,
    score,
    rejects,
    isValid: rejects.filter(r => r.severity === 'critical').length === 0,
  };
}

export function selectBestPalette(candidates: ScoredPalette[]): ScoredPalette | null {
  // Filter to valid palettes only
  const valid = candidates.filter(c => c.isValid);
  
  if (valid.length === 0) {
    // If no valid palettes, return the one with fewest critical issues
    return candidates.sort((a, b) => 
      a.rejects.filter(r => r.severity === 'critical').length -
      b.rejects.filter(r => r.severity === 'critical').length
    )[0] || null;
  }
  
  // Return highest scored valid palette
  return valid.sort((a, b) => b.score.total - a.score.total)[0];
}
