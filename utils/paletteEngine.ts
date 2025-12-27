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
  contrastLevel: number
): NeutralFoundation {
  const targets = NEUTRAL_TARGETS.light;
  
  // Adjust based on contrast level (-5 to 5)
  const contrastMod = contrastLevel * 0.01;
  
  return {
    bg: createNeutral(targets.bg + contrastMod, baseHue, warmth),
    card: createNeutral(targets.card + contrastMod * 0.5, baseHue, warmth),
    card2: createNeutral(targets.card2 + contrastMod * 0.3, baseHue, warmth),
    text: createNeutral(targets.text - contrastMod, baseHue, warmth * 0.3),
    textMuted: createNeutral(targets.textMuted - contrastMod * 0.5, baseHue, warmth * 0.2),
    border: createNeutral(targets.border, baseHue, warmth * 0.5),
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
  brightnessLevel: number
): BrandColors {
  const baseL = 0.55 + brightnessLevel * 0.02;
  const baseC = 0.15 + saturationLevel * 0.015;
  
  // Generate candidates for primary
  const primaryCandidates = generateChromaSamples(hues[0], baseL, rng);
  const primary = selectBestCandidate(primaryCandidates, bg, []);
  
  // Adjust primary chroma based on saturation level
  const adjustedPrimary = clampToSRGBGamut({
    ...primary,
    C: Math.max(0.05, Math.min(0.25, baseC + (saturationLevel * 0.01))),
  });
  
  // Generate scale for primary
  const primaryScale = generateScale(adjustedPrimary);
  
  // Secondary from second hue
  const secondaryCandidates = generateChromaSamples(hues[1], baseL - 0.05, rng);
  const secondary = selectBestCandidate(secondaryCandidates, bg, [adjustedPrimary]);
  
  // Accent from third hue - ensure separation from primary
  const accentCandidates = generateChromaSamples(hues[2], baseL + 0.05, rng);
  const accent = selectBestCandidate(accentCandidates, bg, [adjustedPrimary, secondary]);
  
  return {
    primary: adjustedPrimary,
    primaryScale,
    secondary: clampToSRGBGamut({
      ...secondary,
      C: secondary.C * 0.8,
    }),
    accent: clampToSRGBGamut(accent),
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

function constructStatusColors(
  hues: number[],
  bg: OklchColor,
  rng: SeededRandom,
  saturationLevel: number
): StatusColors {
  // Good - prefer green-ish
  let goodHue = hues[3];
  let badHue = hues[4];
  
  // Swap if bad is closer to green than good
  const goodToGreen = hueDifference(goodHue, 140);
  const badToGreen = hueDifference(badHue, 140);
  const goodToRed = hueDifference(goodHue, 0);
  const badToRed = hueDifference(badHue, 0);
  
  if (badToGreen < goodToGreen || goodToRed < badToRed) {
    [goodHue, badHue] = [badHue, goodHue];
  }
  
  const baseSat = 0.14 + saturationLevel * 0.01;
  const baseL = 0.55;
  
  const good = clampToSRGBGamut({ L: baseL, C: baseSat, H: goodHue });
  const bad = clampToSRGBGamut({ L: baseL, C: baseSat, H: badHue });
  const warn = clampToSRGBGamut({ L: baseL + 0.1, C: baseSat, H: 60 }); // Yellow-ish
  
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

function deriveDarkMode(light: ThemeTokens): ThemeTokens {
  const darkTargets = NEUTRAL_TARGETS.dark;
  
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
  
  // Neutral tokens with specific dark targets
  const darkBg = clampToSRGBGamut({ L: darkTargets.bg, C: lightBg.C * 0.5, H: lightBg.H });
  const darkCard = clampToSRGBGamut({ L: darkTargets.card, C: lightCard.C * 0.5, H: lightCard.H });
  const darkCard2 = clampToSRGBGamut({ L: darkTargets.card2, C: lightCard2.C * 0.5, H: lightCard2.H });
  const darkText = clampToSRGBGamut({ L: darkTargets.text, C: lightText.C * 0.3, H: lightText.H });
  const darkTextMuted = clampToSRGBGamut({ L: darkTargets.textMuted, C: lightTextMuted.C * 0.3, H: lightTextMuted.H });
  const darkBorder = clampToSRGBGamut({ L: darkTargets.border, C: lightBorder.C * 0.5, H: lightBorder.H });
  
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
  
  // Determine base hue
  let baseHue: number;
  if (seedColor) {
    baseHue = toOklch(seedColor).H;
  } else if (overridePalette && overridePalette.length > 0 && overridePalette[0]) {
    baseHue = toOklch(overridePalette[0]).H;
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
  
  // Handle override palette
  if (overridePalette && overridePalette.length === 5) {
    for (let i = 0; i < 5; i++) {
      if (overridePalette[i] && overridePalette[i] !== '') {
        hues[i] = toOklch(overridePalette[i]).H;
      }
    }
  }
  
  // Step 1: Build neutral foundation (light mode)
  const warmth = rng.nextFloat(-0.5, 0.5);
  const neutrals = buildNeutralFoundation(baseHue, warmth, contrastLevel);
  
  // Step 2: Construct brand colors
  const brand = constructBrandColors(hues, neutrals.bg, rng, saturationLevel, brightnessLevel);
  
  // Step 3: Construct status colors
  const status = constructStatusColors(hues, neutrals.bg, rng, saturationLevel);
  
  // Step 4: Assemble light theme
  const light: ThemeTokens = {
    bg: toHex(neutrals.bg),
    card: toHex(neutrals.card),
    card2: toHex(neutrals.card2),
    text: toHex(neutrals.text),
    textMuted: toHex(neutrals.textMuted),
    textOnColor: selectForegroundHex(toHex(brand.primary)),
    primary: toHex(brand.primary),
    primaryFg: selectForegroundHex(toHex(brand.primary)),
    secondary: toHex(brand.secondary),
    secondaryFg: selectForegroundHex(toHex(brand.secondary)),
    accent: toHex(brand.accent),
    accentFg: selectForegroundHex(toHex(brand.accent)),
    border: toHex(neutrals.border),
    ring: toHex(clampToSRGBGamut({ L: 0.6, C: brand.primary.C, H: brand.primary.H })),
    good: toHex(status.good),
    goodFg: toHex(status.goodFg),
    warn: toHex(status.warn),
    warnFg: toHex(status.warnFg),
    bad: toHex(status.bad),
    badFg: toHex(status.badFg),
  };
  
  // Step 5: Derive dark mode deterministically
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

// --- Legacy Compatibility ---

export function generateTheme(
  mode: GenerationMode,
  seedColor?: string,
  saturationLevel: number = 0,
  contrastLevel: number = 0,
  brightnessLevel: number = 0,
  overridePalette?: string[]
): { light: ThemeTokens; dark: ThemeTokens; seed: string } {
  const result = generatePalette(
    mode,
    seedColor,
    saturationLevel,
    contrastLevel,
    brightnessLevel,
    overridePalette
  );
  
  return {
    light: result.light,
    dark: result.dark,
    seed: result.seed,
  };
}

// --- Re-export utilities for convenience ---
export { toOklch, toHex, hexToRgb } from './oklch';
export { contrastRatio, meetsWCAG } from './contrast';
