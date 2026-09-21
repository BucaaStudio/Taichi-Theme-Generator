/**
 * Palette Intelligence Engine
 * Main color generation pipeline using OKLCH
 * Version: 25.12.2
 * 
 * Core Principles:
 * 1. All color computation happens in OKLCH
 * 2. Light mode is generated first
 * 3. Dark mode is derived deterministically from light mode
 * 4. Every palette is scored, validated, and reproducible
 */

import { ThemeTokens, GenerationMode } from '../types.js';
import {
  OklchColor,
  toOklch,
  toHex,
  clampToSRGBGamut,
  hueDifference,
  generateScale,
} from './oklch.js';
import { selectForeground, selectForegroundHex, contrastRatio, adjustForContrast } from './contrast.js';
import { evaluateDualPalette } from './scoringEngine.js';

// --- Seeded Random ---

class SeededRandom {
  private seed: number;
  
  constructor(seed: string | number) {
    if (typeof seed === 'string') {
      this.seed = this.hashString(seed);
    } else {
      this.seed = seed;
    }
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  }
  
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

const RANDOM_HARMONIES: GenerationMode[] = [
  'analogous', 'complementary', 'split-complementary',
  'triadic', 'tetradic', 'compound', 'triadic-split',
];

/** Mint a new canonical seed hex. Hue + chroma are encoded in the color itself. */
export function mintSeedHex(): string {
  const hue = Math.floor(Math.random() * 360);
  const C = 0.10 + Math.random() * 0.10;
  const L = 0.48 + Math.random() * 0.08;
  return toHex(clampToSRGBGamut({ L, C, H: hue }));
}

/** Encode a hue as the canonical seed hex used for replay. */
export function seedFromHue(hue: number, chroma: number = 0.15): string {
  return toHex(clampToSRGBGamut({ L: 0.5, C: chroma, H: ((hue % 360) + 360) % 360 }));
}

export function warmthFromSeed(seed: string): number {
  return new SeededRandom(`${seed}:warmth`).nextFloat(-0.5, 0.5);
}

/** Small occupancy bias encoded in the seed so search variants persist. */
export function occupancyFromSeed(seed: string): number {
  return new SeededRandom(`${seed}:occ`).nextFloat(-0.05, 0.05);
}

function mixHue(from: number, to: number, t: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return (from + delta * Math.max(0, Math.min(1, t)) + 360) % 360;
}

/** Blend brand hue toward warm (60) or cool (240) by |warmth|. */
export function surfaceHueFromWarmth(baseHue: number, warmth: number): number {
  const target = warmth >= 0 ? 60 : 240;
  return mixHue(baseHue, target, Math.min(1, Math.abs(warmth) * 1.6));
}

function isNarrowHarmony(mode: GenerationMode): boolean {
  return mode === 'monochrome' || mode === 'analogous';
}

export function resolveHarmonyMode(mode: GenerationMode, seed: string): GenerationMode {
  if (mode === 'random') {
    return new SeededRandom(`${seed}:harmony`).pick(RANDOM_HARMONIES);
  }
  return mode;
}

// --- Harmony Modes ---

interface HarmonyConfig {
  offsets: number[];
  chromaVariance: number;
}

const HARMONY_MODES: Record<string, HarmonyConfig> = {
  monochrome: { offsets: [0, 0, 0, 0, 0], chromaVariance: 0.3 },
  analogous: { offsets: [0, 30, -30, 15, -15], chromaVariance: 0.15 },
  complementary: { offsets: [0, 180, 30, 210, -30], chromaVariance: 0.2 },
  'split-complementary': { offsets: [0, 150, 210, 30, 180], chromaVariance: 0.2 },
  triadic: { offsets: [0, 120, 240, 60, 180], chromaVariance: 0.15 },
  tetradic: { offsets: [0, 90, 180, 270, 45], chromaVariance: 0.2 },
  compound: { offsets: [0, 165, 180, 195, 30], chromaVariance: 0.25 },
  'triadic-split': { offsets: [0, 120, 150, 240, 270], chromaVariance: 0.2 },
};

function normalizeOverridePalette(overridePalette?: string[]): Array<string | null> | null {
  if (!overridePalette || (overridePalette.length !== 5 && overridePalette.length !== 10)) return null;
  return overridePalette.map((color) => {
    const trimmed = color ? color.trim() : '';
    return trimmed ? trimmed : null;
  });
}

interface OverrideMap {
  bg: string | null; card: string | null; text: string | null;
  textMuted: string | null; textOnColor: string | null;
  primary: string | null; secondary: string | null; accent: string | null;
  good: string | null; bad: string | null;
}

function destructureOverrides(normalizedOverrides: Array<string | null> | null): OverrideMap {
  const empty: OverrideMap = { bg: null, card: null, text: null, textMuted: null, textOnColor: null, primary: null, secondary: null, accent: null, good: null, bad: null };
  if (!normalizedOverrides) return empty;
  if (normalizedOverrides.length === 10) {
    // 10-color: [bg, card, text, textMuted, textOnColor, primary, secondary, accent, good, bad]
    return {
      bg: normalizedOverrides[0], card: normalizedOverrides[1], text: normalizedOverrides[2],
      textMuted: normalizedOverrides[3], textOnColor: normalizedOverrides[4],
      primary: normalizedOverrides[5], secondary: normalizedOverrides[6], accent: normalizedOverrides[7],
      good: normalizedOverrides[8], bad: normalizedOverrides[9],
    };
  }
  // 5-color (legacy): [primary, secondary, accent, good, bad]
  return {
    ...empty,
    primary: normalizedOverrides[0], secondary: normalizedOverrides[1], accent: normalizedOverrides[2],
    good: normalizedOverrides[3], bad: normalizedOverrides[4],
  };
}

interface GenerationPlan {
  resolvedSeed: string;
  baseHue: number;
  harmonyMode: GenerationMode;
  hues: number[];
  warmth: number;
  occupancy: number;
  normalizedOverrides: Array<string | null> | null;
  ov: OverrideMap;
}

function applyOverrideHues(hues: number[], normalizedOverrides: Array<string | null> | null): void {
  if (!normalizedOverrides) return;
  if (normalizedOverrides.length === 10) {
    const overrideToHue: Record<number, number> = { 5: 0, 6: 1, 7: 2, 8: 3, 9: 4 };
    for (const [oi, hi] of Object.entries(overrideToHue)) {
      const overrideColor = normalizedOverrides[Number(oi)];
      if (overrideColor) {
        hues[hi] = toOklch(overrideColor).H;
      }
    }
    return;
  }
  for (let i = 0; i < 5; i++) {
    const overrideColor = normalizedOverrides[i];
    if (overrideColor) {
      hues[i] = toOklch(overrideColor).H;
    }
  }
}

function createGenerationPlan(
  mode: GenerationMode,
  seedColor?: string,
  overridePalette?: string[]
): GenerationPlan {
  const normalizedOverrides = normalizeOverridePalette(overridePalette);
  const resolvedSeed = seedColor || mintSeedHex();
  const primaryIdx = normalizedOverrides && normalizedOverrides.length === 10 ? 5 : 0;

  const baseHue = normalizedOverrides?.[primaryIdx]
    ? toOklch(normalizedOverrides[primaryIdx]!).H
    : toOklch(resolvedSeed).H;

  const harmonyMode = resolveHarmonyMode(mode, resolvedSeed);
  const harmony = HARMONY_MODES[harmonyMode] || HARMONY_MODES.analogous;
  const hues = harmony.offsets.map((offset) => (baseHue + offset + 360) % 360);
  applyOverrideHues(hues, normalizedOverrides);

  return {
    resolvedSeed,
    baseHue,
    harmonyMode,
    hues,
    warmth: warmthFromSeed(resolvedSeed),
    occupancy: occupancyFromSeed(resolvedSeed),
    normalizedOverrides,
    ov: destructureOverrides(normalizedOverrides),
  };
}

// --- Neutral Foundation (Light Mode) ---

interface NeutralFoundation {
  bg: OklchColor;
  card: OklchColor;
  card2: OklchColor;
  text: OklchColor;
  textMuted: OklchColor;
  border: OklchColor;
}

const NEUTRAL_TARGETS = {
  light: {
    bg: 0.97,
    card: 0.93,
    card2: 0.90,
    text: 0.18,
    textMuted: 0.42,
    border: 0.82,
  },
  dark: {
    bg: 0.20,
    card: 0.26,
    card2: 0.32,
    text: 0.93,
    textMuted: 0.70,
    border: 0.38,
  },
};

function buildNeutralFoundation(
  baseHue: number,
  warmth: number,
  contrastLevel: number,
  brightnessLevel: number = 0,
  saturationLevel: number = 0
): NeutralFoundation {
  const targets = NEUTRAL_TARGETS.light;
  
  // Contrast level adjusts the spread between light and dark values
  // (-5 to 5): negative = lower contrast, positive = higher contrast
  const contrastMod = contrastLevel * 0.015;
  
  // Brightness level shifts all lightness values
  // (-5 to 5): negative = darker, positive = lighter
  const brightnessMod = brightnessLevel * 0.02;
  
  // Saturation level affects the chroma/tint of neutral colors
  // (-5 to 5): negative = more neutral, positive = more tinted.
  // A small warmth-driven base tint keeps surfaces from reading as dead gray.
  const chromaMod = 0.0025 + Math.abs(warmth) * 0.005 + Math.max(0, saturationLevel * 0.003);
  const surfaceHue = surfaceHueFromWarmth(baseHue, warmth);
  
  // Apply brightness to lightness targets
  const bgL = Math.max(0.85, Math.min(0.99, targets.bg + brightnessMod + contrastMod));
  const cardL = Math.max(0.80, Math.min(0.96, targets.card + brightnessMod * 0.8 + contrastMod * 0.5));
  const card2L = Math.max(0.75, Math.min(0.93, targets.card2 + brightnessMod * 0.6 + contrastMod * 0.3));
  const textL = Math.max(0.05, Math.min(0.35, targets.text - brightnessMod * 0.3 - contrastMod));
  const textMutedL = Math.max(0.25, Math.min(0.55, targets.textMuted - brightnessMod * 0.2 - contrastMod * 0.5));
  const borderL = Math.max(0.70, Math.min(0.88, targets.border + brightnessMod * 0.3));
  
  return {
    bg: clampToSRGBGamut({ L: bgL, C: chromaMod, H: surfaceHue }),
    card: clampToSRGBGamut({ L: cardL, C: chromaMod * 0.8, H: surfaceHue }),
    card2: clampToSRGBGamut({ L: card2L, C: chromaMod * 0.6, H: surfaceHue }),
    text: clampToSRGBGamut({ L: textL, C: chromaMod * 0.2, H: baseHue }),
    textMuted: clampToSRGBGamut({ L: textMutedL, C: chromaMod * 0.15, H: baseHue }),
    border: clampToSRGBGamut({ L: borderL, C: chromaMod * 0.4, H: surfaceHue }),
  };
}

// --- Candidate Generation ---

interface ColorCandidate {
  color: OklchColor;
  score: number;
}

/**
 * Build a vivid, hue-balanced color for a semantic role.
 *
 * Absolute chroma targets make vividness hue-dependent (at L≈0.52 sRGB allows
 * C≈0.21 for blue but only ≈0.11 for yellow), so palettes mixed dull teals
 * with punchy blues. Instead:
 * 1. Bias lightness toward the hue's chroma cusp (the L with the most gamut
 *    headroom) within a role-appropriate band, so e.g. yellows lift out of
 *    muddy olive territory.
 * 2. Target a fraction of the max in-gamut chroma at that lightness
 *    (occupancy), capped absolutely so low-cusp hues don't scream.
 */
function buildRoleColor(
  hue: number,
  baseL: number,
  lRange: [number, number],
  occupancy: number,
  chromaCap: number
): OklchColor {
  // Coarse cusp search: L with maximum in-gamut chroma for this hue.
  let cuspL = baseL;
  let cuspC = 0;
  for (let l = 0.35; l <= 0.78; l += 0.05) {
    const c = maxGamutChromaAt(l, hue);
    if (c > cuspC) {
      cuspC = c;
      cuspL = l;
    }
  }
  const L = Math.max(lRange[0], Math.min(lRange[1], baseL + (cuspL - baseL) * 0.35));
  const cMax = maxGamutChromaAt(L, hue);
  const C = Math.max(0.03, Math.min(chromaCap, cMax * occupancy));
  return clampToSRGBGamut({ L, C, H: hue });
}

// --- Primary & Accent Construction ---

interface BrandColors {
  primary: OklchColor;
  primaryScale: Map<number, OklchColor>;
  secondary: OklchColor;
  accent: OklchColor;
}

function ensureSurfaceContrast(color: OklchColor, bg: OklchColor, minRatio: number): OklchColor {
  if (contrastRatio(toHex(color), toHex(bg)) >= minRatio) return color;
  return adjustForContrast(color, bg, minRatio);
}

function constructBrandColors(
  hues: number[],
  bg: OklchColor,
  saturationLevel: number,
  brightnessLevel: number,
  contrastLevel: number,
  occupancyBias: number = 0
): BrandColors {
  // Brightness affects base lightness of all brand colors
  const baseL = 0.52 + brightnessLevel * 0.025;

  // Saturation maps to gamut occupancy so vividness reads the same at every hue
  const satNormalized = (saturationLevel + 5) / 10; // 0 to 1, 0.5 at defaults
  const occ = Math.max(0.45, Math.min(0.95, 0.2 + satNormalized + occupancyBias));

  // Contrast affects the lightness difference between colors
  const contrastMod = contrastLevel * 0.02;

  const primaryL = Math.max(0.35, Math.min(0.70, baseL - contrastMod));
  const adjustedPrimary = ensureSurfaceContrast(
    buildRoleColor(hues[0], primaryL, [0.44, 0.62], occ, 0.20),
    bg,
    3
  );

  // Generate scale for primary
  const primaryScale = generateScale(adjustedPrimary);

  // Secondary - softer occupancy, slightly lighter
  const secondaryL = Math.max(0.40, Math.min(0.75, baseL + 0.08));
  const adjustedSecondary = ensureSurfaceContrast(
    buildRoleColor(hues[1], secondaryL, [0.48, 0.68], occ * 0.74, 0.15),
    bg,
    3
  );

  // Accent - most vivid of the three
  const accentL = Math.max(0.45, Math.min(0.72, baseL + 0.05));
  const adjustedAccent = ensureSurfaceContrast(
    buildRoleColor(hues[2], accentL, [0.46, 0.66], Math.min(0.95, occ * 1.12), 0.22),
    bg,
    3
  );

  return {
    primary: adjustedPrimary,
    primaryScale,
    secondary: adjustedSecondary,
    accent: adjustedAccent,
  };
}

// --- Status Colors ---

interface StatusColors {
  good: OklchColor;
  goodFg: OklchColor;
  bad: OklchColor;
  badFg: OklchColor;
  warn: OklchColor;
  warnFg: OklchColor;
}

const STATUS_GREEN_HUE = 140;
const STATUS_RED_HUE = 0;
const STATUS_GREEN_RANGE = 40;
const STATUS_RED_RANGE = 32;

const normalizeHue = (hue: number) => ((hue % 360) + 360) % 360;

const clampHueToBand = (hue: number, center: number, maxDelta: number) => {
  const diff = ((hue - center + 540) % 360) - 180;
  if (Math.abs(diff) <= maxDelta) {
    return normalizeHue(hue);
  }
  return normalizeHue(center + Math.sign(diff) * maxDelta);
};

const resolveStatusHues = (hues: number[], harmonyMode: GenerationMode) => {
  let goodHue = hues[3] ?? hues[0];
  let badHue = hues[4] ?? hues[1] ?? hues[0];

  const goodToGreen = hueDifference(goodHue, STATUS_GREEN_HUE);
  const badToGreen = hueDifference(badHue, STATUS_GREEN_HUE);
  const goodToRed = hueDifference(goodHue, STATUS_RED_HUE);
  const badToRed = hueDifference(badHue, STATUS_RED_HUE);

  if (badToGreen < goodToGreen || goodToRed < badToRed) {
    [goodHue, badHue] = [badHue, goodHue];
  }

  if (isNarrowHarmony(harmonyMode)) {
    if (harmonyMode === 'monochrome' && hueDifference(goodHue, badHue) < 8) {
      return {
        goodHue: normalizeHue(goodHue + 8),
        badHue: normalizeHue(badHue - 8),
      };
    }
    return {
      goodHue: normalizeHue(goodHue),
      badHue: normalizeHue(badHue),
    };
  }

  return {
    goodHue: clampHueToBand(goodHue, STATUS_GREEN_HUE, STATUS_GREEN_RANGE),
    badHue: clampHueToBand(badHue, STATUS_RED_HUE, STATUS_RED_RANGE),
  };
};

function constructStatusColors(
  hues: number[],
  bg: OklchColor,
  saturationLevel: number,
  brightnessLevel: number,
  occupancyBias: number = 0,
  harmonyMode: GenerationMode = 'analogous'
): StatusColors {
  const { goodHue, badHue } = resolveStatusHues(hues, harmonyMode);
  const warnHue = isNarrowHarmony(harmonyMode) ? (hues[2] ?? hues[0]) : 60;

  // Saturation maps to gamut occupancy (see buildRoleColor)
  const satNormalized = (saturationLevel + 5) / 10; // 0 to 1
  const occ = Math.max(0.35, Math.min(0.95, 0.14 + satNormalized * 0.96 + occupancyBias));

  // Brightness affects lightness
  const baseL = 0.52 + brightnessLevel * 0.025;

  const good = ensureSurfaceContrast(buildRoleColor(goodHue, baseL, [0.44, 0.62], occ, 0.17), bg, 3);
  const bad = ensureSurfaceContrast(buildRoleColor(badHue, baseL, [0.44, 0.60], occ, 0.18), bg, 3);
  const warn = ensureSurfaceContrast(buildRoleColor(warnHue, baseL + 0.12, [0.58, 0.72], occ * 0.92, 0.15), bg, 3);
  
  return {
    good,
    goodFg: selectForeground(good),
    bad,
    badFg: selectForeground(bad),
    warn,
    warnFg: selectForeground(warn),
  };
}

// --- Dark Mode Derivation ---

interface CompanionChromaOptions {
  minChroma?: number;
  relativeBias?: number;
  maxRelative?: number;
  relativeWeight?: number;
  maxChangeRatio?: number;
}

function maxGamutChromaAt(lightness: number, hue: number): number {
  const safeL = Math.max(0.001, Math.min(0.999, lightness));
  // Probe with high chroma and let gamut mapping resolve the max reachable value.
  return clampToSRGBGamut({ L: safeL, C: 0.4, H: hue }).C;
}

function remapCompanionChroma(
  source: OklchColor,
  targetL: number,
  options: CompanionChromaOptions = {}
): number {
  const sourceMax = Math.max(0.001, maxGamutChromaAt(source.L, source.H));
  const targetMax = Math.max(0.001, maxGamutChromaAt(targetL, source.H));
  const sourceRelative = source.C / sourceMax;
  const relative = Math.max(
    0,
    Math.min(options.maxRelative ?? 1, sourceRelative * (options.relativeBias ?? 1))
  );
  const relativeTarget = targetMax * relative;
  const absoluteTarget = Math.min(targetMax, source.C);
  const relativeWeight = Math.max(0, Math.min(1, options.relativeWeight ?? 0.58));

  // Blend two strategies:
  // 1) relative gamut occupancy (mode consistency)
  // 2) absolute chroma retention (saturation consistency)
  let targetChroma = absoluteTarget * (1 - relativeWeight) + relativeTarget * relativeWeight;

  // Bound saturation drift so companion mode does not look over/under-saturated.
  const maxChangeRatio = options.maxChangeRatio;
  if (typeof maxChangeRatio === 'number' && Number.isFinite(maxChangeRatio) && maxChangeRatio >= 0) {
    const low = source.C * Math.max(0, 1 - maxChangeRatio);
    const high = source.C * (1 + maxChangeRatio);
    targetChroma = Math.max(low, Math.min(high, targetChroma));
  }

  // Never force a floor above the source chroma; this preserves user desaturation.
  const minChroma = options.minChroma ?? 0;
  const adaptiveMin = Math.min(minChroma, source.C * 0.9);
  return Math.max(adaptiveMin, Math.min(targetMax, targetChroma));
}

function deriveCompanionColor(
  source: OklchColor,
  targetL: number,
  options: CompanionChromaOptions = {}
): OklchColor {
  const safeL = Math.max(0.03, Math.min(0.97, targetL));
  const safeC = remapCompanionChroma(source, safeL, options);
  return clampToSRGBGamut({ L: safeL, C: safeC, H: source.H });
}

function deriveDarkMode(light: ThemeTokens, brightnessLevel: number = 0): ThemeTokens {
  const darkTargets = NEUTRAL_TARGETS.dark;
  
  // Positive brightness makes dark mode lighter, negative makes it darker
  const brightnessMod = brightnessLevel * 0.02;
  
  const lightBg = toOklch(light.bg);
  const lightCard = toOklch(light.card);
  const lightCard2 = toOklch(light.card2);
  const lightText = toOklch(light.text);
  const lightTextMuted = toOklch(light.textMuted);
  const lightPrimary = toOklch(light.primary);
  const lightSecondary = toOklch(light.secondary);
  const lightAccent = toOklch(light.accent);
  const lightBorder = toOklch(light.border);
  const lightGood = toOklch(light.good);
  const lightBad = toOklch(light.bad);
  const lightWarn = toOklch(light.warn);
  
  // Neutral tokens with specific dark targets, adjusted by brightness
  const darkBg = clampToSRGBGamut({ L: Math.max(0.16, Math.min(0.34, darkTargets.bg + brightnessMod)), C: lightBg.C * 0.5, H: lightBg.H });
  const darkCard = clampToSRGBGamut({ L: Math.max(0.22, Math.min(0.40, darkTargets.card + brightnessMod)), C: lightCard.C * 0.5, H: lightCard.H });
  const darkCard2 = clampToSRGBGamut({ L: Math.max(0.26, Math.min(0.46, darkTargets.card2 + brightnessMod)), C: lightCard2.C * 0.5, H: lightCard2.H });
  const darkText = clampToSRGBGamut({ L: darkTargets.text, C: lightText.C * 0.3, H: lightText.H });
  const darkTextMuted = clampToSRGBGamut({ L: darkTargets.textMuted, C: lightTextMuted.C * 0.3, H: lightTextMuted.H });
  const darkBorder = clampToSRGBGamut({ L: Math.max(0.24, Math.min(0.46, darkTargets.border + brightnessMod)), C: lightBorder.C * 0.5, H: lightBorder.H });
  
  // Brand + status colors preserve relative chroma headroom so light/dark feel matched.
  const darkPrimary = deriveCompanionColor(lightPrimary, Math.min(0.65, lightPrimary.L + 0.1), {
    minChroma: 0.03,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const darkSecondary = deriveCompanionColor(lightSecondary, Math.min(0.60, lightSecondary.L + 0.05), {
    minChroma: 0.024,
    relativeBias: 1.0,
    maxChangeRatio: 0.2,
  });
  const darkAccent = deriveCompanionColor(lightAccent, Math.min(0.70, lightAccent.L + 0.15), {
    minChroma: 0.03,
    relativeBias: 1.0,
    maxChangeRatio: 0.2,
  });
  const darkGood = deriveCompanionColor(lightGood, lightGood.L + 0.05, {
    minChroma: 0.04,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const darkBad = deriveCompanionColor(lightBad, lightBad.L + 0.05, {
    minChroma: 0.04,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const darkWarn = deriveCompanionColor(lightWarn, lightWarn.L, {
    minChroma: 0.038,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });

  // Keep focus ring chroma aligned with primary across modes.
  const darkRing = deriveCompanionColor(lightPrimary, 0.6, {
    minChroma: 0.03,
    relativeBias: 1,
  });
  
  return {
    bg: toHex(darkBg),
    card: toHex(darkCard),
    card2: toHex(darkCard2),
    text: toHex(darkText),
    textMuted: toHex(darkTextMuted),
    textOnColor: selectForegroundHex(toHex(darkPrimary)),
    primary: toHex(darkPrimary),
    primaryFg: selectForegroundHex(toHex(darkPrimary)),
    secondary: toHex(darkSecondary),
    secondaryFg: selectForegroundHex(toHex(darkSecondary)),
    accent: toHex(darkAccent),
    accentFg: selectForegroundHex(toHex(darkAccent)),
    border: toHex(darkBorder),
    ring: toHex(darkRing),
    good: toHex(darkGood),
    goodFg: selectForegroundHex(toHex(darkGood)),
    warn: toHex(darkWarn),
    warnFg: selectForegroundHex(toHex(darkWarn)),
    bad: toHex(darkBad),
    badFg: selectForegroundHex(toHex(darkBad)),
  };
}

// --- Light Mode Derivation (for dark-first generation) ---

function deriveLightMode(dark: ThemeTokens): ThemeTokens {
  const lightTargets = NEUTRAL_TARGETS.light;
  
  const darkBg = toOklch(dark.bg);
  const darkCard = toOklch(dark.card);
  const darkCard2 = toOklch(dark.card2);
  const darkText = toOklch(dark.text);
  const darkTextMuted = toOklch(dark.textMuted);
  const darkPrimary = toOklch(dark.primary);
  const darkSecondary = toOklch(dark.secondary);
  const darkAccent = toOklch(dark.accent);
  const darkBorder = toOklch(dark.border);
  const darkGood = toOklch(dark.good);
  const darkBad = toOklch(dark.bad);
  const darkWarn = toOklch(dark.warn);
  
  // Neutral tokens with specific light targets
  const lightBg = clampToSRGBGamut({ L: lightTargets.bg, C: darkBg.C * 0.5, H: darkBg.H });
  const lightCard = clampToSRGBGamut({ L: lightTargets.card, C: darkCard.C * 0.5, H: darkCard.H });
  const lightCard2 = clampToSRGBGamut({ L: lightTargets.card2, C: darkCard2.C * 0.5, H: darkCard2.H });
  const lightText = clampToSRGBGamut({ L: lightTargets.text, C: darkText.C * 0.3, H: darkText.H });
  const lightTextMuted = clampToSRGBGamut({ L: lightTargets.textMuted, C: darkTextMuted.C * 0.3, H: darkTextMuted.H });
  const lightBorder = clampToSRGBGamut({ L: lightTargets.border, C: darkBorder.C * 0.5, H: darkBorder.H });
  
  // Brand + status colors preserve relative chroma headroom so light/dark feel matched.
  const lightPrimary = deriveCompanionColor(darkPrimary, Math.max(0.35, darkPrimary.L - 0.1), {
    minChroma: 0.03,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const lightSecondary = deriveCompanionColor(darkSecondary, Math.max(0.40, darkSecondary.L - 0.05), {
    minChroma: 0.024,
    relativeBias: 1.0,
    maxChangeRatio: 0.2,
  });
  const lightAccent = deriveCompanionColor(darkAccent, Math.max(0.30, darkAccent.L - 0.15), {
    minChroma: 0.03,
    relativeBias: 1.0,
    maxChangeRatio: 0.2,
  });
  const lightGood = deriveCompanionColor(darkGood, darkGood.L - 0.05, {
    minChroma: 0.04,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const lightBad = deriveCompanionColor(darkBad, darkBad.L - 0.05, {
    minChroma: 0.04,
    relativeBias: 1.0,
    maxChangeRatio: 0.18,
  });
  const lightWarn = deriveCompanionColor(darkWarn, darkWarn.L, {
    minChroma: 0.038,
    relativeBias: 1,
    maxChangeRatio: 0.18,
  });

  // Keep focus ring chroma aligned with primary across modes.
  const lightRing = deriveCompanionColor(darkPrimary, 0.6, {
    minChroma: 0.03,
    relativeBias: 1,
  });
  
  return {
    bg: toHex(lightBg),
    card: toHex(lightCard),
    card2: toHex(lightCard2),
    text: toHex(lightText),
    textMuted: toHex(lightTextMuted),
    textOnColor: selectForegroundHex(toHex(lightPrimary)),
    primary: toHex(lightPrimary),
    primaryFg: selectForegroundHex(toHex(lightPrimary)),
    secondary: toHex(lightSecondary),
    secondaryFg: selectForegroundHex(toHex(lightSecondary)),
    accent: toHex(lightAccent),
    accentFg: selectForegroundHex(toHex(lightAccent)),
    border: toHex(lightBorder),
    ring: toHex(lightRing),
    good: toHex(lightGood),
    goodFg: selectForegroundHex(toHex(lightGood)),
    warn: toHex(lightWarn),
    warnFg: selectForegroundHex(toHex(lightWarn)),
    bad: toHex(lightBad),
    badFg: selectForegroundHex(toHex(lightBad)),
  };
}

// --- Main Generation Function ---

export interface PaletteResult {
  light: ThemeTokens;
  dark: ThemeTokens;
  seed: string;
  baseHue: number;
  mode: GenerationMode;
  score?: number;
}

export function generatePalette(
  mode: GenerationMode,
  seedColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[]
): PaletteResult {
  const { resolvedSeed, baseHue, harmonyMode, hues, warmth, occupancy, ov } =
    createGenerationPlan(mode, seedColor, overridePalette);

  // Step 1: Build neutral foundation (light mode) - applies all three levels
  const neutrals = buildNeutralFoundation(baseHue, warmth, contrastLevel, brightnessLevel, saturationLevel);

  // Step 2: Construct brand colors - applies saturation, brightness, contrast
  const brand = constructBrandColors(hues, neutrals.bg, saturationLevel, brightnessLevel, contrastLevel, occupancy);

  // Step 3: Construct status colors - applies saturation, brightness
  const status = constructStatusColors(hues, neutrals.bg, saturationLevel, brightnessLevel, occupancy, harmonyMode);

  if (ov.bg) neutrals.bg = toOklch(ov.bg);
  if (ov.card) {
    neutrals.card = toOklch(ov.card);
    const cardOklch = toOklch(ov.card);
    neutrals.card2 = clampToSRGBGamut({ L: Math.max(0, cardOklch.L - 0.03), C: cardOklch.C, H: cardOklch.H });
  }
  if (ov.text) {
    neutrals.text = toOklch(ov.text);
    if (!ov.textMuted) {
      const textOklch = toOklch(ov.text);
      neutrals.textMuted = clampToSRGBGamut({ L: Math.min(1, textOklch.L + 0.24), C: textOklch.C * 0.7, H: textOklch.H });
    }
  }
  if (ov.textMuted) neutrals.textMuted = toOklch(ov.textMuted);
  if (ov.primary) brand.primary = toOklch(ov.primary);
  if (ov.secondary) brand.secondary = toOklch(ov.secondary);
  if (ov.accent) brand.accent = toOklch(ov.accent);
  if (ov.good) status.good = toOklch(ov.good);
  if (ov.bad) status.bad = toOklch(ov.bad);

  const primaryHex = ov.primary || toHex(brand.primary);
  const secondaryHex = ov.secondary || toHex(brand.secondary);
  const accentHex = ov.accent || toHex(brand.accent);
  const goodHex = ov.good || toHex(status.good);
  const badHex = ov.bad || toHex(status.bad);
  const warnHex = toHex(status.warn);
  const statusUsesOverrides = Boolean(ov.good || ov.bad);

  // Step 4: Assemble light theme
  const light: ThemeTokens = {
    bg: ov.bg || toHex(neutrals.bg),
    card: ov.card || toHex(neutrals.card),
    card2: toHex(neutrals.card2),
    text: ov.text || toHex(neutrals.text),
    textMuted: ov.textMuted || toHex(neutrals.textMuted),
    textOnColor: ov.textOnColor || selectForegroundHex(primaryHex),
    primary: primaryHex,
    primaryFg: selectForegroundHex(primaryHex),
    secondary: secondaryHex,
    secondaryFg: selectForegroundHex(secondaryHex),
    accent: accentHex,
    accentFg: selectForegroundHex(accentHex),
    border: toHex(neutrals.border),
    ring: toHex(clampToSRGBGamut({ L: 0.6, C: brand.primary.C, H: brand.primary.H })),
    good: goodHex,
    goodFg: statusUsesOverrides ? selectForegroundHex(goodHex) : toHex(status.goodFg),
    warn: warnHex,
    warnFg: statusUsesOverrides ? selectForegroundHex(warnHex) : toHex(status.warnFg),
    bad: badHex,
    badFg: statusUsesOverrides ? selectForegroundHex(badHex) : toHex(status.badFg),
  };
  
  // Step 5: Derive the other mode deterministically
  const dark = deriveDarkMode(light, brightnessLevel);
  
  // Step 6: Score and validate
  const scored = evaluateDualPalette(
    {
      bg: light.bg,
      card: light.card,
      text: light.text,
      textMuted: light.textMuted,
      primary: light.primary,
      secondary: light.secondary,
      accent: light.accent,
      good: light.good,
      bad: light.bad,
    },
    {
      bg: dark.bg,
      card: dark.card,
      text: dark.text,
      textMuted: dark.textMuted,
      primary: dark.primary,
      secondary: dark.secondary,
      accent: dark.accent,
      good: dark.good,
      bad: dark.bad,
    },
    baseHue,
    harmonyMode
  );
  
  return {
    light,
    dark,
    seed: resolvedSeed,
    baseHue,
    mode: harmonyMode as GenerationMode,
    score: scored.score.total,
  };
}

// --- Dark-First Generation ---

export function generatePaletteDarkFirst(
  mode: GenerationMode,
  seedColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[]
): PaletteResult {
  const { resolvedSeed, baseHue, harmonyMode, hues, warmth, occupancy, ov } =
    createGenerationPlan(mode, seedColor, overridePalette);

  // Use dark neutral targets
  const darkTargets = NEUTRAL_TARGETS.dark;

  // Apply brightness/contrast/saturation for dark mode
  const brightnessMod = brightnessLevel * 0.015;
  const contrastMod = contrastLevel * 0.012;
  // Warmth-driven base tint keeps dark surfaces from reading as dead gray.
  const chromaMod = 0.003 + Math.abs(warmth) * 0.006 + Math.max(0, saturationLevel * 0.003);
  const surfaceHue = surfaceHueFromWarmth(baseHue, warmth);

  // Build dark neutral foundation directly
  const darkNeutrals = {
    bg: clampToSRGBGamut({ L: Math.max(0.16, darkTargets.bg - brightnessMod - contrastMod), C: chromaMod * 0.5, H: surfaceHue }),
    card: clampToSRGBGamut({ L: Math.max(0.22, darkTargets.card - brightnessMod * 0.8 - contrastMod * 0.5), C: chromaMod * 0.4, H: surfaceHue }),
    card2: clampToSRGBGamut({ L: Math.max(0.26, darkTargets.card2 - brightnessMod * 0.6 - contrastMod * 0.3), C: chromaMod * 0.3, H: surfaceHue }),
    text: clampToSRGBGamut({ L: Math.min(0.98, darkTargets.text + brightnessMod * 0.3 + contrastMod), C: chromaMod * 0.1, H: baseHue }),
    textMuted: clampToSRGBGamut({ L: Math.min(0.85, darkTargets.textMuted + brightnessMod * 0.2 + contrastMod * 0.5), C: chromaMod * 0.08, H: baseHue }),
    border: clampToSRGBGamut({ L: Math.min(0.40, darkTargets.border - brightnessMod * 0.2), C: chromaMod * 0.2, H: surfaceHue }),
  };

  // Build brand colors for dark mode (higher lightness for visibility);
  // saturation maps to gamut occupancy so vividness is hue-balanced.
  const satNormalized = (saturationLevel + 5) / 10;
  const occ = Math.max(0.45, Math.min(0.95, 0.17 + satNormalized * 0.94 + occupancy));
  const baseL = 0.58 + brightnessLevel * 0.02;

  const darkBrand = {
    primary: ensureSurfaceContrast(buildRoleColor(hues[0], baseL, [0.52, 0.68], occ, 0.17), darkNeutrals.bg, 3),
    secondary: ensureSurfaceContrast(buildRoleColor(hues[1], baseL - 0.05, [0.48, 0.64], occ * 0.74, 0.13), darkNeutrals.bg, 3),
    accent: ensureSurfaceContrast(buildRoleColor(hues[2], baseL + 0.05, [0.54, 0.72], Math.min(0.92, occ * 1.1), 0.19), darkNeutrals.bg, 3),
  };

  // Status colors for dark
  const statusOcc = Math.max(0.35, Math.min(0.95, 0.12 + satNormalized * 0.9 + occupancy));
  const statusL = 0.55 + brightnessLevel * 0.02;
  const { goodHue, badHue } = resolveStatusHues(hues, harmonyMode);
  const warnHue = isNarrowHarmony(harmonyMode) ? (hues[2] ?? hues[0]) : 60;

  const darkStatus = {
    good: ensureSurfaceContrast(buildRoleColor(goodHue, statusL, [0.50, 0.66], statusOcc, 0.15), darkNeutrals.bg, 3),
    bad: ensureSurfaceContrast(buildRoleColor(badHue, statusL, [0.50, 0.64], statusOcc, 0.16), darkNeutrals.bg, 3),
    warn: ensureSurfaceContrast(buildRoleColor(warnHue, statusL + 0.1, [0.60, 0.74], statusOcc * 0.92, 0.14), darkNeutrals.bg, 3),
  };

  if (ov.bg) darkNeutrals.bg = toOklch(ov.bg);
  if (ov.card) {
    darkNeutrals.card = toOklch(ov.card);
    const cardOklch = toOklch(ov.card);
    darkNeutrals.card2 = clampToSRGBGamut({ L: Math.min(1, cardOklch.L + 0.03), C: cardOklch.C, H: cardOklch.H });
  }
  if (ov.text) {
    darkNeutrals.text = toOklch(ov.text);
    if (!ov.textMuted) {
      const textOklch = toOklch(ov.text);
      darkNeutrals.textMuted = clampToSRGBGamut({ L: Math.max(0, textOklch.L - 0.24), C: textOklch.C * 0.7, H: textOklch.H });
    }
  }
  if (ov.textMuted) darkNeutrals.textMuted = toOklch(ov.textMuted);
  if (ov.primary) darkBrand.primary = toOklch(ov.primary);
  if (ov.secondary) darkBrand.secondary = toOklch(ov.secondary);
  if (ov.accent) darkBrand.accent = toOklch(ov.accent);
  if (ov.good) darkStatus.good = toOklch(ov.good);
  if (ov.bad) darkStatus.bad = toOklch(ov.bad);

  const primaryHex = ov.primary || toHex(darkBrand.primary);
  const secondaryHex = ov.secondary || toHex(darkBrand.secondary);
  const accentHex = ov.accent || toHex(darkBrand.accent);
  const goodHex = ov.good || toHex(darkStatus.good);
  const badHex = ov.bad || toHex(darkStatus.bad);
  const warnHex = toHex(darkStatus.warn);

  // Assemble dark theme
  const dark: ThemeTokens = {
    bg: ov.bg || toHex(darkNeutrals.bg),
    card: ov.card || toHex(darkNeutrals.card),
    card2: toHex(darkNeutrals.card2),
    text: ov.text || toHex(darkNeutrals.text),
    textMuted: ov.textMuted || toHex(darkNeutrals.textMuted),
    textOnColor: ov.textOnColor || selectForegroundHex(primaryHex),
    primary: primaryHex,
    primaryFg: selectForegroundHex(primaryHex),
    secondary: secondaryHex,
    secondaryFg: selectForegroundHex(secondaryHex),
    accent: accentHex,
    accentFg: selectForegroundHex(accentHex),
    border: toHex(darkNeutrals.border),
    ring: toHex(clampToSRGBGamut({ L: 0.5, C: darkBrand.primary.C * 0.8, H: darkBrand.primary.H })),
    good: goodHex,
    goodFg: selectForegroundHex(goodHex),
    warn: warnHex,
    warnFg: selectForegroundHex(warnHex),
    bad: badHex,
    badFg: selectForegroundHex(badHex),
  };
  
  // Derive light mode from dark
  const light = deriveLightMode(dark);
  
  // Score based on both modes
  const scored = evaluateDualPalette(
    {
      bg: light.bg,
      card: light.card,
      text: light.text,
      textMuted: light.textMuted,
      primary: light.primary,
      secondary: light.secondary,
      accent: light.accent,
      good: light.good,
      bad: light.bad,
    },
    {
      bg: dark.bg,
      card: dark.card,
      text: dark.text,
      textMuted: dark.textMuted,
      primary: dark.primary,
      secondary: dark.secondary,
      accent: dark.accent,
      good: dark.good,
      bad: dark.bad,
    },
    baseHue,
    harmonyMode
  );
  
  return {
    light,
    dark,
    seed: resolvedSeed,
    baseHue,
    mode: harmonyMode as GenerationMode,
    score: scored.score.total,
  };
}

// --- Legacy Compatibility ---

export function generateTheme(
  mode: GenerationMode,
  seedColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[],
  darkFirst: boolean = false
): { light: ThemeTokens; dark: ThemeTokens; seed: string; mode: GenerationMode } {
  const result = darkFirst
    ? generatePaletteDarkFirst(mode, seedColor, saturationLevel, contrastLevel, brightnessLevel, overridePalette)
    : generatePalette(mode, seedColor, saturationLevel, contrastLevel, brightnessLevel, overridePalette);
  
  return {
    light: result.light,
    dark: result.dark,
    seed: result.seed,
    mode: result.mode,
  };
}

// --- Re-export utilities for convenience ---
export { toOklch, toHex, hexToRgb } from './oklch.js';
export { contrastRatio, meetsWCAG } from './contrast.js';
