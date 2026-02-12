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

import { ThemeTokens, GenerationMode } from '../types';
import {
  OklchColor,
  toOklch,
  toHex,
  clampToSRGBGamut,
  deltaE,
  hueDifference,
  adjustLightness,
  adjustChroma,
  shiftHue,
  createNeutral,
  generateScale,
  hexToRgb,
} from './oklch';
import { contrastRatio, selectForegroundHex, adjustForContrast, meetsWCAG } from './contrast';
import { evaluatePalette, selectBestPalette, ScoredPalette } from './scoringEngine';

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
    bg: 0.08,
    card: 0.12,
    card2: 0.15,
    text: 0.92,
    textMuted: 0.65,
    border: 0.25,
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
  // (-5 to 5): negative = more neutral, positive = more tinted
  const chromaMod = Math.max(0, saturationLevel * 0.003);
  
  // Apply brightness to lightness targets
  const bgL = Math.max(0.85, Math.min(0.99, targets.bg + brightnessMod + contrastMod));
  const cardL = Math.max(0.80, Math.min(0.96, targets.card + brightnessMod * 0.8 + contrastMod * 0.5));
  const card2L = Math.max(0.75, Math.min(0.93, targets.card2 + brightnessMod * 0.6 + contrastMod * 0.3));
  const textL = Math.max(0.05, Math.min(0.35, targets.text - brightnessMod * 0.3 - contrastMod));
  const textMutedL = Math.max(0.25, Math.min(0.55, targets.textMuted - brightnessMod * 0.2 - contrastMod * 0.5));
  const borderL = Math.max(0.70, Math.min(0.88, targets.border + brightnessMod * 0.3));
  
  return {
    bg: clampToSRGBGamut({ L: bgL, C: chromaMod, H: warmth > 0 ? 60 : 240 }),
    card: clampToSRGBGamut({ L: cardL, C: chromaMod * 0.8, H: warmth > 0 ? 60 : 240 }),
    card2: clampToSRGBGamut({ L: card2L, C: chromaMod * 0.6, H: warmth > 0 ? 60 : 240 }),
    text: clampToSRGBGamut({ L: textL, C: chromaMod * 0.2, H: baseHue }),
    textMuted: clampToSRGBGamut({ L: textMutedL, C: chromaMod * 0.15, H: baseHue }),
    border: clampToSRGBGamut({ L: borderL, C: chromaMod * 0.4, H: warmth > 0 ? 60 : 240 }),
  };
}

// --- Candidate Generation ---

interface ColorCandidate {
  color: OklchColor;
  score: number;
}

function generateChromaSamples(
  hue: number,
  lightness: number,
  rng: SeededRandom,
  count: number = 8
): OklchColor[] {
  const samples: OklchColor[] = [];
  
  for (let i = 0; i < count; i++) {
    const chroma = rng.nextFloat(0.08, 0.22);
    samples.push(clampToSRGBGamut({ L: lightness, C: chroma, H: hue }));
  }
  
  return samples;
}

function selectBestCandidate(
  candidates: OklchColor[],
  bg: OklchColor,
  existingColors: OklchColor[]
): OklchColor {
  let bestScore = -Infinity;
  let best = candidates[0];
  
  for (const candidate of candidates) {
    let score = 0;
    
    // Contrast with background
    const contrast = contrastRatio(toHex(candidate), toHex(bg));
    score += contrast * 2;
    
    // Separation from existing colors
    for (const existing of existingColors) {
      const delta = deltaE(candidate, existing);
      score += delta * 10;
    }
    
    // Prefer colors with moderate chroma
    if (candidate.C >= 0.1 && candidate.C <= 0.2) {
      score += 5;
    }
    
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  
  return best;
}

// --- Primary & Accent Construction ---

interface BrandColors {
  primary: OklchColor;
  primaryScale: Map<number, OklchColor>;
  secondary: OklchColor;
  accent: OklchColor;
}

function constructBrandColors(
  hues: number[],
  bg: OklchColor,
  rng: SeededRandom,
  saturationLevel: number,
  brightnessLevel: number,
  contrastLevel: number
): BrandColors {
  // Brightness affects base lightness of all brand colors
  // Range: -5 to 5 maps to lightness adjustments
  const baseL = 0.52 + brightnessLevel * 0.025;
  
  // Saturation level strongly affects chroma
  // Range: -5 (grayscale) to 5 (vivid)
  // Map from -5..5 to 0.02..0.28 chroma range
  const satNormalized = (saturationLevel + 5) / 10; // 0 to 1
  const baseC = 0.02 + satNormalized * 0.24;
  
  // Contrast affects the lightness difference between colors
  const contrastMod = contrastLevel * 0.02;
  
  // Generate candidates for primary
  const primaryCandidates = generateChromaSamples(hues[0], baseL, rng);
  const primary = selectBestCandidate(primaryCandidates, bg, []);
  
  // Apply saturation and brightness to primary
  const adjustedPrimary = clampToSRGBGamut({
    L: Math.max(0.35, Math.min(0.70, baseL - contrastMod)),
    C: Math.max(0.03, baseC),
    H: primary.H,
  });
  
  // Generate scale for primary
  const primaryScale = generateScale(adjustedPrimary);
  
  // Secondary - slightly less saturated, different lightness
  const secondaryL = Math.max(0.40, Math.min(0.75, baseL + 0.08));
  const secondaryCandidates = generateChromaSamples(hues[1], secondaryL, rng);
  const secondary = selectBestCandidate(secondaryCandidates, bg, [adjustedPrimary]);
  
  const adjustedSecondary = clampToSRGBGamut({
    L: secondaryL,
    C: Math.max(0.02, baseC * 0.75),
    H: secondary.H,
  });
  
  // Accent - slightly more saturated, brighter
  const accentL = Math.max(0.45, Math.min(0.72, baseL + 0.05));
  const accentCandidates = generateChromaSamples(hues[2], accentL, rng);
  const accent = selectBestCandidate(accentCandidates, bg, [adjustedPrimary, adjustedSecondary]);
  
  const adjustedAccent = clampToSRGBGamut({
    L: accentL,
    C: Math.max(0.03, baseC * 1.1),
    H: accent.H,
  });
  
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

const resolveStatusHues = (hues: number[]) => {
  let goodHue = hues[3] ?? hues[0];
  let badHue = hues[4] ?? hues[1] ?? hues[0];

  const goodToGreen = hueDifference(goodHue, STATUS_GREEN_HUE);
  const badToGreen = hueDifference(badHue, STATUS_GREEN_HUE);
  const goodToRed = hueDifference(goodHue, STATUS_RED_HUE);
  const badToRed = hueDifference(badHue, STATUS_RED_HUE);

  if (badToGreen < goodToGreen || goodToRed < badToRed) {
    [goodHue, badHue] = [badHue, goodHue];
  }

  return {
    goodHue: clampHueToBand(goodHue, STATUS_GREEN_HUE, STATUS_GREEN_RANGE),
    badHue: clampHueToBand(badHue, STATUS_RED_HUE, STATUS_RED_RANGE),
  };
};

function constructStatusColors(
  hues: number[],
  bg: OklchColor,
  rng: SeededRandom,
  saturationLevel: number,
  brightnessLevel: number
): StatusColors {
  const { goodHue, badHue } = resolveStatusHues(hues);
  
  // Saturation affects chroma of status colors
  const satNormalized = (saturationLevel + 5) / 10; // 0 to 1
  const baseC = 0.08 + satNormalized * 0.16;
  
  // Brightness affects lightness
  const baseL = 0.52 + brightnessLevel * 0.025;
  
  const good = clampToSRGBGamut({ L: baseL, C: baseC, H: goodHue });
  const bad = clampToSRGBGamut({ L: baseL, C: baseC, H: badHue });
  const warn = clampToSRGBGamut({ L: baseL + 0.12, C: baseC * 0.9, H: 60 }); // Yellow-ish
  
  return {
    good,
    goodFg: { L: 1, C: 0, H: goodHue },
    bad,
    badFg: { L: 1, C: 0, H: badHue },
    warn,
    warnFg: { L: 0.1, C: 0, H: 60 },
  };
}

// --- Dark Mode Derivation ---

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
  
  // Invert lightness with offsets
  const invertL = (light: OklchColor, offset: number = 0): OklchColor => {
    return clampToSRGBGamut({
      L: Math.max(0.05, Math.min(0.95, 1 - light.L + offset)),
      C: light.C * 0.85,
      H: light.H,
    });
  };
  
  // Neutral tokens with specific dark targets, adjusted by brightness
  const darkBg = clampToSRGBGamut({ L: Math.max(0.03, Math.min(0.25, darkTargets.bg + brightnessMod)), C: lightBg.C * 0.5, H: lightBg.H });
  const darkCard = clampToSRGBGamut({ L: Math.max(0.06, Math.min(0.30, darkTargets.card + brightnessMod)), C: lightCard.C * 0.5, H: lightCard.H });
  const darkCard2 = clampToSRGBGamut({ L: Math.max(0.09, Math.min(0.35, darkTargets.card2 + brightnessMod)), C: lightCard2.C * 0.5, H: lightCard2.H });
  const darkText = clampToSRGBGamut({ L: darkTargets.text, C: lightText.C * 0.3, H: lightText.H });
  const darkTextMuted = clampToSRGBGamut({ L: darkTargets.textMuted, C: lightTextMuted.C * 0.3, H: lightTextMuted.H });
  const darkBorder = clampToSRGBGamut({ L: Math.max(0.15, Math.min(0.40, darkTargets.border + brightnessMod)), C: lightBorder.C * 0.5, H: lightBorder.H });
  
  // Brand colors - preserve hue, adjust lightness for dark
  const darkPrimary = clampToSRGBGamut({
    L: Math.min(0.65, lightPrimary.L + 0.1),
    C: lightPrimary.C * 0.9,
    H: lightPrimary.H,
  });
  
  const darkSecondary = clampToSRGBGamut({
    L: Math.min(0.60, lightSecondary.L + 0.05),
    C: lightSecondary.C * 0.85,
    H: lightSecondary.H,
  });
  
  const darkAccent = clampToSRGBGamut({
    L: Math.min(0.70, lightAccent.L + 0.15),
    C: lightAccent.C * 0.9,
    H: lightAccent.H,
  });
  
  // Status colors
  const darkGood = clampToSRGBGamut({
    L: lightGood.L + 0.05,
    C: lightGood.C * 0.85,
    H: lightGood.H,
  });
  
  const darkBad = clampToSRGBGamut({
    L: lightBad.L + 0.05,
    C: lightBad.C * 0.85,
    H: lightBad.H,
  });
  
  const darkWarn = clampToSRGBGamut({
    L: lightWarn.L,
    C: lightWarn.C * 0.85,
    H: lightWarn.H,
  });
  
  // Ring and foreground tokens
  const darkRing = clampToSRGBGamut({
    L: 0.6,
    C: lightPrimary.C * 0.7,
    H: lightPrimary.H,
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
  
  // Brand colors - preserve hue, adjust lightness for light mode
  const lightPrimary = clampToSRGBGamut({
    L: Math.max(0.35, darkPrimary.L - 0.1),
    C: darkPrimary.C * 1.1,
    H: darkPrimary.H,
  });
  
  const lightSecondary = clampToSRGBGamut({
    L: Math.max(0.40, darkSecondary.L - 0.05),
    C: darkSecondary.C * 1.15,
    H: darkSecondary.H,
  });
  
  const lightAccent = clampToSRGBGamut({
    L: Math.max(0.30, darkAccent.L - 0.15),
    C: darkAccent.C * 1.1,
    H: darkAccent.H,
  });
  
  // Status colors
  const lightGood = clampToSRGBGamut({
    L: darkGood.L - 0.05,
    C: darkGood.C * 1.15,
    H: darkGood.H,
  });
  
  const lightBad = clampToSRGBGamut({
    L: darkBad.L - 0.05,
    C: darkBad.C * 1.15,
    H: darkBad.H,
  });
  
  const lightWarn = clampToSRGBGamut({
    L: darkWarn.L,
    C: darkWarn.C * 1.15,
    H: darkWarn.H,
  });
  
  // Ring token
  const lightRing = clampToSRGBGamut({
    L: 0.6,
    C: darkPrimary.C * 1.2,
    H: darkPrimary.H,
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
  // Initialize RNG
  const rngSeed = seedColor || `${Date.now()}-${Math.random()}`;
  const rng = new SeededRandom(rngSeed);
  const normalizedOverrides = normalizeOverridePalette(overridePalette);
  
  // Determine base hue
  // For 10-color overrides: primary is at index 5; for 5-color: primary is at index 0
  const primaryIdx = normalizedOverrides && normalizedOverrides.length === 10 ? 5 : 0;
  let baseHue: number;
  if (seedColor) {
    baseHue = toOklch(seedColor).H;
  } else if (normalizedOverrides?.[primaryIdx]) {
    baseHue = toOklch(normalizedOverrides[primaryIdx]).H;
  } else if (overridePalette && overridePalette[primaryIdx]) {
    baseHue = toOklch(overridePalette[primaryIdx]).H;
  } else {
    baseHue = rng.nextInt(0, 359);
  }

  // Select harmony mode
  let harmonyMode = mode;
  if (mode === 'random') {
    const modes: GenerationMode[] = [
      'analogous', 'complementary', 'split-complementary',
      'triadic', 'tetradic', 'compound', 'triadic-split'
    ];
    harmonyMode = rng.pick(modes);
  }

  const harmony = HARMONY_MODES[harmonyMode] || HARMONY_MODES.analogous;
  const hues = harmony.offsets.map(offset => (baseHue + offset + 360) % 360);

  // Handle override palette - map override indices to hue indices
  // 10-color layout: [bg(0), card(1), text(2), textMuted(3), textOnColor(4), primary(5), secondary(6), accent(7), good(8), bad(9)]
  // 5-color layout: [primary(0), secondary(1), accent(2), good(3), bad(4)]
  // Hue layout: [primary(0), secondary(1), accent(2), good(3), bad(4)]
  if (normalizedOverrides) {
    if (normalizedOverrides.length === 10) {
      const overrideToHue: Record<number, number> = { 5: 0, 6: 1, 7: 2, 8: 3, 9: 4 };
      for (const [oi, hi] of Object.entries(overrideToHue)) {
        const overrideColor = normalizedOverrides[Number(oi)];
        if (overrideColor) {
          hues[hi] = toOklch(overrideColor).H;
        }
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const overrideColor = normalizedOverrides[i];
        if (overrideColor) {
          hues[i] = toOklch(overrideColor).H;
        }
      }
    }
  }

  // Step 1: Build neutral foundation (light mode) - applies all three levels
  const warmth = rng.nextFloat(-0.5, 0.5);
  const neutrals = buildNeutralFoundation(baseHue, warmth, contrastLevel, brightnessLevel, saturationLevel);

  // Step 2: Construct brand colors - applies saturation, brightness, contrast
  const brand = constructBrandColors(hues, neutrals.bg, rng, saturationLevel, brightnessLevel, contrastLevel);

  // Step 3: Construct status colors - applies saturation, brightness
  const status = constructStatusColors(hues, neutrals.bg, rng, saturationLevel, brightnessLevel);

  // Destructure overrides based on layout
  // 10-color: [bg, card, text, textMuted, textOnColor, primary, secondary, accent, good, bad]
  // 5-color (legacy): [primary, secondary, accent, good, bad]
  const ov = destructureOverrides(normalizedOverrides);

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
  const dark = deriveDarkMode(light);
  
  // Step 6: Score and validate
  const scored = evaluatePalette(
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
    baseHue
  );
  
  return {
    light,
    dark,
    seed: seedColor || toHex({ L: 0.5, C: 0.15, H: baseHue }),
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
  // Initialize RNG
  const rngSeed = seedColor || `${Date.now()}-${Math.random()}`;
  const rng = new SeededRandom(rngSeed);
  const normalizedOverrides = normalizeOverridePalette(overridePalette);
  
  // Determine base hue
  const primaryIdx = normalizedOverrides && normalizedOverrides.length === 10 ? 5 : 0;
  let baseHue: number;
  if (seedColor) {
    baseHue = toOklch(seedColor).H;
  } else if (normalizedOverrides?.[primaryIdx]) {
    baseHue = toOklch(normalizedOverrides[primaryIdx]).H;
  } else if (overridePalette && overridePalette[primaryIdx]) {
    baseHue = toOklch(overridePalette[primaryIdx]).H;
  } else {
    baseHue = rng.nextInt(0, 359);
  }

  // Select harmony mode
  let harmonyMode = mode;
  if (mode === 'random') {
    const modes: GenerationMode[] = [
      'analogous', 'complementary', 'split-complementary',
      'triadic', 'tetradic', 'compound', 'triadic-split'
    ];
    harmonyMode = rng.pick(modes);
  }

  const harmony = HARMONY_MODES[harmonyMode] || HARMONY_MODES.analogous;
  const hues = harmony.offsets.map(offset => (baseHue + offset + 360) % 360);

  // Handle override palette hues
  if (normalizedOverrides) {
    if (normalizedOverrides.length === 10) {
      const overrideToHue: Record<number, number> = { 5: 0, 6: 1, 7: 2, 8: 3, 9: 4 };
      for (const [oi, hi] of Object.entries(overrideToHue)) {
        const overrideColor = normalizedOverrides[Number(oi)];
        if (overrideColor) {
          hues[hi] = toOklch(overrideColor).H;
        }
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const overrideColor = normalizedOverrides[i];
        if (overrideColor) {
          hues[i] = toOklch(overrideColor).H;
        }
      }
    }
  }

  // Use dark neutral targets
  const warmth = rng.nextFloat(-0.5, 0.5);
  const darkTargets = NEUTRAL_TARGETS.dark;

  // Apply brightness/contrast/saturation for dark mode
  const brightnessMod = brightnessLevel * 0.015;
  const contrastMod = contrastLevel * 0.012;
  const chromaMod = Math.max(0, saturationLevel * 0.003);

  // Build dark neutral foundation directly
  const darkNeutrals = {
    bg: clampToSRGBGamut({ L: Math.max(0.03, darkTargets.bg - brightnessMod), C: chromaMod * 0.5, H: warmth > 0 ? 60 : 240 }),
    card: clampToSRGBGamut({ L: Math.max(0.06, darkTargets.card - brightnessMod * 0.8), C: chromaMod * 0.4, H: warmth > 0 ? 60 : 240 }),
    card2: clampToSRGBGamut({ L: Math.max(0.09, darkTargets.card2 - brightnessMod * 0.6), C: chromaMod * 0.3, H: warmth > 0 ? 60 : 240 }),
    text: clampToSRGBGamut({ L: Math.min(0.98, darkTargets.text + brightnessMod * 0.3), C: chromaMod * 0.1, H: baseHue }),
    textMuted: clampToSRGBGamut({ L: Math.min(0.85, darkTargets.textMuted + brightnessMod * 0.2), C: chromaMod * 0.08, H: baseHue }),
    border: clampToSRGBGamut({ L: Math.min(0.40, darkTargets.border - brightnessMod * 0.2), C: chromaMod * 0.2, H: warmth > 0 ? 60 : 240 }),
  };

  // Build brand colors for dark mode (higher lightness for visibility)
  const satNormalized = (saturationLevel + 5) / 10;
  const baseC = 0.02 + satNormalized * 0.20;
  const baseL = 0.58 + brightnessLevel * 0.02;

  const darkBrand = {
    primary: clampToSRGBGamut({ L: baseL, C: baseC, H: hues[0] }),
    secondary: clampToSRGBGamut({ L: baseL - 0.05, C: baseC * 0.8, H: hues[1] }),
    accent: clampToSRGBGamut({ L: baseL + 0.05, C: baseC * 1.1, H: hues[2] }),
  };

  // Status colors for dark
  const statusC = 0.08 + satNormalized * 0.14;
  const statusL = 0.55 + brightnessLevel * 0.02;
  const { goodHue, badHue } = resolveStatusHues(hues);

  const darkStatus = {
    good: clampToSRGBGamut({ L: statusL, C: statusC, H: goodHue }),
    bad: clampToSRGBGamut({ L: statusL, C: statusC, H: badHue }),
    warn: clampToSRGBGamut({ L: statusL + 0.1, C: statusC * 0.9, H: 60 }),
  };

  // Destructure overrides (handles both 5-color and 10-color layouts)
  const ov = destructureOverrides(normalizedOverrides);

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
  
  // Score based on dark mode
  const scored = evaluatePalette(
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
    baseHue
  );
  
  return {
    light,
    dark,
    seed: seedColor || toHex({ L: 0.5, C: 0.15, H: baseHue }),
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
): { light: ThemeTokens; dark: ThemeTokens; seed: string } {
  const result = darkFirst
    ? generatePaletteDarkFirst(mode, seedColor, saturationLevel, contrastLevel, brightnessLevel, overridePalette)
    : generatePalette(mode, seedColor, saturationLevel, contrastLevel, brightnessLevel, overridePalette);
  
  return {
    light: result.light,
    dark: result.dark,
    seed: result.seed,
  };
}

// --- Re-export utilities for convenience ---
export { toOklch, toHex, hexToRgb } from './oklch';
export { contrastRatio, meetsWCAG } from './contrast';
