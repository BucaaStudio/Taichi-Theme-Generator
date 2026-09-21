/**
 * Scoring and Validation Engine
 * Hard rejects and role-aware soft scoring for light/dark palette pairs
 */

import { toOklch, deltaE, hueDifference, isInSRGBGamut } from './oklch.js';
import { contrastRatio, getContrastHeadroom } from './contrast.js';
import type { GenerationMode } from '../types.js';

const SCORE_WEIGHTS = {
  contrastHeadroom: 2.0,
  harmonyConsistency: 1.5,
  chromaBalance: 1.2,
  uiUsability: 1.8,
  aestheticBias: 1.0,
};

export const HARMONY_HUE_OFFSETS: Record<string, number[]> = {
  monochrome: [0, 0, 0, 0, 0],
  analogous: [0, 30, -30, 15, -15],
  complementary: [0, 180, 30, 210, -30],
  'split-complementary': [0, 150, 210, 30, 180],
  triadic: [0, 120, 240, 60, 180],
  tetradic: [0, 90, 180, 270, 45],
  compound: [0, 165, 180, 195, 30],
  'triadic-split': [0, 120, 150, 240, 270],
};

export const THRESHOLDS = {
  minTextContrast: 4.5,
  minMutedContrast: 3.0,
  minPrimaryToAccentDelta: 0.12,
  minBgToCardDelta: 0.03,
  dangerHueRange: { min: 350, max: 10 },
  warnHueRange: { min: 35, max: 55 },
};

export interface RejectReason {
  code: string;
  message: string;
  severity: 'critical' | 'major';
}

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

export interface ScoredPalette {
  palette: PaletteCandidate;
  score: ScoreBreakdown;
  rejects: RejectReason[];
  isValid: boolean;
}

export function checkHardRejects(palette: PaletteCandidate): RejectReason[] {
  const rejects: RejectReason[] = [];

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

  const mutedOnBg = contrastRatio(palette.textMuted, palette.bg);
  if (mutedOnBg < THRESHOLDS.minMutedContrast) {
    rejects.push({
      code: 'LOW_MUTED_CONTRAST',
      message: `Muted text contrast ${mutedOnBg.toFixed(2)} < ${THRESHOLDS.minMutedContrast}`,
      severity: 'major',
    });
  }

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

function expectedHue(baseHue: number, offset: number): number {
  return (baseHue + offset + 360) % 360;
}

function mudPenalty(color: { L: number; C: number; H: number }): number {
  const midL = color.L > 0.38 && color.L < 0.64;
  const midC = color.C > 0.03 && color.C < 0.11;
  const yellowGreen = color.H >= 70 && color.H <= 130;
  const brown = color.H >= 28 && color.H <= 70;
  if (midL && midC && (yellowGreen || brown)) return 4;
  return 0;
}

export function scorePalette(
  palette: PaletteCandidate,
  baseHue: number,
  mode: GenerationMode = 'analogous'
): ScoreBreakdown {
  const primaryOklch = toOklch(palette.primary);
  const secondaryOklch = toOklch(palette.secondary);
  const accentOklch = toOklch(palette.accent);
  const goodOklch = toOklch(palette.good);
  const badOklch = toOklch(palette.bad);
  const bgOklch = toOklch(palette.bg);

  const textBgHeadroom = getContrastHeadroom(palette.text, palette.bg);
  const textCardHeadroom = getContrastHeadroom(palette.text, palette.card);
  const contrastHeadroom = Math.min(10, Math.max(0, textBgHeadroom + textCardHeadroom));

  const offsets = HARMONY_HUE_OFFSETS[mode] || HARMONY_HUE_OFFSETS.analogous;
  const primaryErr = hueDifference(primaryOklch.H, expectedHue(baseHue, offsets[0]));
  const secondaryErr = hueDifference(secondaryOklch.H, expectedHue(baseHue, offsets[1]));
  const accentErr = hueDifference(accentOklch.H, expectedHue(baseHue, offsets[2]));
  const harmonyConsistency = Math.max(0, 10 - (primaryErr + secondaryErr + accentErr) / 18);

  const chromas = [primaryOklch.C, secondaryOklch.C, accentOklch.C];
  const avgChroma = chromas.reduce((a, b) => a + b, 0) / chromas.length;
  const chromaVariance = chromas.reduce((sum, c) => sum + Math.pow(c - avgChroma, 2), 0) / chromas.length;
  const chromaBalance = 10 - Math.min(10, chromaVariance * 1000);

  const pairs = [
    [primaryOklch, secondaryOklch],
    [primaryOklch, accentOklch],
    [secondaryOklch, accentOklch],
    [primaryOklch, goodOklch],
    [primaryOklch, badOklch],
    [goodOklch, badOklch],
  ] as const;
  const minDelta = Math.min(...pairs.map(([a, b]) => deltaE(a, b)));
  const distinctiveness = Math.min(10, minDelta * 40);

  const primaryProminence = primaryOklch.C > 0.1 ? 5 : primaryOklch.C * 50;
  const mutedRatio = contrastRatio(palette.textMuted, palette.bg);
  const mutedBalance = mutedRatio >= 3 && mutedRatio < 7 ? 5 : 2;
  const uiUsability = Math.min(10, (primaryProminence + mutedBalance) * 0.5 + distinctiveness * 0.5);

  const goodLightness = bgOklch.L > 0.9 || bgOklch.L < 0.15 ? 8 : 5;
  const goodSaturation = primaryOklch.C > 0.05 && primaryOklch.C < 0.25 ? 5 : 2;
  const mud = mudPenalty(primaryOklch) + mudPenalty(secondaryOklch) + mudPenalty(accentOklch);
  const aestheticBias = Math.max(0, goodLightness + goodSaturation - mud);

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

const IDENTITY_KEYS = ['primary', 'secondary', 'accent', 'good', 'bad'] as const;

function scoreCrossModeIdentity(light: PaletteCandidate, dark: PaletteCandidate): number {
  let hueScore = 0;
  for (const key of IDENTITY_KEYS) {
    const lightColor = toOklch(light[key]);
    const darkColor = toOklch(dark[key]);
    if (Math.max(lightColor.C, darkColor.C) < 0.02) continue;
    const drift = hueDifference(lightColor.H, darkColor.H);
    hueScore += drift <= 8 ? 2 : Math.max(0, 2 - drift / 10);
  }

  const lightPrimaryContrast = contrastRatio(light.primary, light.bg);
  const darkPrimaryContrast = contrastRatio(dark.primary, dark.bg);
  const contrastGap = Math.abs(lightPrimaryContrast - darkPrimaryContrast);
  const contrastScore = Math.max(0, 6 - contrastGap);

  return hueScore + contrastScore;
}

export function evaluatePalette(
  palette: PaletteCandidate,
  baseHue: number,
  mode: GenerationMode = 'analogous'
): ScoredPalette {
  const rejects = checkHardRejects(palette);
  const score = scorePalette(palette, baseHue, mode);

  return {
    palette,
    score,
    rejects,
    isValid: rejects.filter((r) => r.severity === 'critical').length === 0,
  };
}

export function evaluateDualPalette(
  light: PaletteCandidate,
  dark: PaletteCandidate,
  baseHue: number,
  mode: GenerationMode = 'analogous'
): ScoredPalette {
  const lightEval = evaluatePalette(light, baseHue, mode);
  const darkEval = evaluatePalette(dark, baseHue, mode);
  const identity = scoreCrossModeIdentity(light, dark);

  return {
    palette: light,
    score: {
      contrastHeadroom: (lightEval.score.contrastHeadroom + darkEval.score.contrastHeadroom) / 2,
      harmonyConsistency: (lightEval.score.harmonyConsistency + darkEval.score.harmonyConsistency) / 2,
      chromaBalance: (lightEval.score.chromaBalance + darkEval.score.chromaBalance) / 2,
      uiUsability: (lightEval.score.uiUsability + darkEval.score.uiUsability) / 2,
      aestheticBias: (lightEval.score.aestheticBias + darkEval.score.aestheticBias) / 2,
      total: lightEval.score.total + darkEval.score.total + identity,
    },
    rejects: [...lightEval.rejects, ...darkEval.rejects],
    isValid: lightEval.isValid && darkEval.isValid,
  };
}

export function selectBestPalette(candidates: ScoredPalette[]): ScoredPalette | null {
  if (candidates.length === 0) return null;

  const indexed = candidates.map((candidate, index) => ({ candidate, index }));
  const valid = indexed.filter(({ candidate }) => candidate.isValid);
  const pool = valid.length > 0 ? valid : indexed;

  pool.sort((a, b) => {
    if (valid.length === 0) {
      const critA = a.candidate.rejects.filter((r) => r.severity === 'critical').length;
      const critB = b.candidate.rejects.filter((r) => r.severity === 'critical').length;
      if (critA !== critB) return critA - critB;
    }
    const scoreDelta = b.candidate.score.total - a.candidate.score.total;
    if (Math.abs(scoreDelta) < 1) return a.index - b.index;
    return scoreDelta;
  });

  return pool[0].candidate;
}
