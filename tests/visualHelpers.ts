import { contrastRatio } from '../utils/contrast';
import { deltaE, hexToRgb, hueDifference, toOklch } from '../utils/oklch';
import type { ThemeTokens } from '../types';

export const HARMONY_MODES = [
  'monochrome',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'compound',
  'triadic-split',
] as const;

export const VISUAL_HUES = [0, 40, 60, 120, 200, 280] as const;
export const HIGH_CONTRAST_STEPS = [3, 4, 5] as const;

const BRAND_KEYS = ['primary', 'secondary', 'accent'] as const;

export function maxChannel(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b);
}

export function minChannel(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return Math.min(r, g, b);
}

/** OLED-black and crushed greys that still pass `!== '#000000'`. */
export function isVisuallyVoid(hex: string): boolean {
  return maxChannel(hex) < 14 || toOklch(hex).L < 0.15;
}

export function isVisuallyWhite(hex: string): boolean {
  return minChannel(hex) > 252 && toOklch(hex).L > 0.99;
}

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

export function describeTheme(
  theme: ThemeTokens,
  extra: Record<string, string | number | boolean> = {}
): string {
  const parts = Object.entries(extra).map(([key, value]) => `${key}=${value}`);
  parts.push(`bg=${theme.bg}`, `card=${theme.card}`, `card2=${theme.card2}`, `primary=${theme.primary}`);
  return parts.join(' ');
}

export function assertDarkSurfaceNotVoid(hex: string, context: string): void {
  const rgb = hexToRgb(hex);
  const color = toOklch(hex);
  if (isVisuallyVoid(hex)) {
    fail(
      context,
      `dark surface ${hex} is a visual void (rgb=${rgb.r},${rgb.g},${rgb.b} L=${color.L.toFixed(3)}). ` +
        `Need charcoal, not OLED black.`
    );
  }
}

export function assertMutedHierarchy(theme: ThemeTokens, context: string): void {
  const text = toOklch(theme.text);
  const muted = toOklch(theme.textMuted);
  const delta = deltaE(text, muted);
  if (theme.text === theme.textMuted) {
    fail(context, `muted collapsed onto body text (${theme.text})`);
  }
  if (delta < 0.10) {
    fail(context, `muted too close to body ΔE=${delta.toFixed(3)} text=${theme.text} muted=${theme.textMuted}`);
  }
  const bodyRatio = contrastRatio(theme.text, theme.bg);
  const mutedRatio = contrastRatio(theme.textMuted, theme.bg);
  if (bodyRatio < mutedRatio + 1.8) {
    fail(
      context,
      `muted is not visually quieter than body textGain=${(bodyRatio - mutedRatio).toFixed(2)} ` +
        `body=${bodyRatio.toFixed(2)} muted=${mutedRatio.toFixed(2)}`
    );
  }
}

export function assertLightMutedNotInk(theme: ThemeTokens, context: string): void {
  const text = toOklch(theme.text);
  const muted = toOklch(theme.textMuted);
  if (muted.L < 0.36) {
    fail(context, `light muted over-inked L=${muted.L.toFixed(3)} ${theme.textMuted}`);
  }
  if (muted.L - text.L < 0.14) {
    fail(
      context,
      `light muted too close to body ΔL=${(muted.L - text.L).toFixed(3)} ` +
        `text=${theme.text} muted=${theme.textMuted}`
    );
  }
}

export function assertBrandLooksLikeColor(
  theme: ThemeTokens,
  polarity: 'light' | 'dark',
  seedHue: number,
  context: string
): void {
  for (const key of BRAND_KEYS) {
    const color = toOklch(theme[key]);
    if (color.C < 0.04) {
      fail(context, `${key} lost chroma C=${color.C.toFixed(3)} ${theme[key]}`);
    }
    if (polarity === 'light' && (color.L < 0.46 || color.L > 0.74)) {
      fail(context, `light ${key} crushed/washed L=${color.L.toFixed(3)} ${theme[key]}`);
    }
    if (polarity === 'dark' && (color.L < 0.45 || color.L > 0.84)) {
      fail(context, `dark ${key} crushed/blown L=${color.L.toFixed(3)} ${theme[key]}`);
    }
    const vsBg = contrastRatio(theme[key], theme.bg);
    const vsCard = contrastRatio(theme[key], theme.card);
    if (Math.min(vsBg, vsCard) < 3.0) {
      fail(
        context,
        `${key} not visible on surfaces ratio bg=${vsBg.toFixed(2)} card=${vsCard.toFixed(2)} ${theme[key]}`
      );
    }
  }

  const primary = toOklch(theme.primary);
  const hueDrift = hueDifference(primary.H, seedHue);
  if (hueDrift > 28) {
    fail(context, `primary hue drifted ${hueDrift.toFixed(1)}° from seed ${seedHue.toFixed(1)} (${theme.primary})`);
  }

  const onColor = contrastRatio(theme.textOnColor, theme.primary);
  if (onColor < 4.5) {
    fail(context, `textOnColor ${theme.textOnColor} on primary ${theme.primary} ratio=${onColor.toFixed(2)}`);
  }
}

export function assertSurfaceLadder(
  theme: ThemeTokens,
  polarity: 'light' | 'dark',
  context: string
): void {
  const bg = toOklch(theme.bg);
  const card = toOklch(theme.card);
  const card2 = toOklch(theme.card2);
  const border = toOklch(theme.border);

  if (theme.bg === theme.card || theme.card === theme.card2 || theme.bg === theme.card2) {
    fail(context, `surfaces share a hex bg=${theme.bg} card=${theme.card} card2=${theme.card2}`);
  }

  const cardDelta = deltaE(bg, card);
  const nestedDelta = deltaE(card, card2);
  const cardRatio = contrastRatio(theme.card, theme.bg);
  if (cardDelta < 0.055) {
    fail(context, `card not distinct from bg ΔE=${cardDelta.toFixed(3)} bg=${theme.bg} card=${theme.card}`);
  }
  if (nestedDelta < 0.040) {
    fail(context, `card2 not distinct from card ΔE=${nestedDelta.toFixed(3)} card=${theme.card} card2=${theme.card2}`);
  }
  if (cardRatio < 1.15) {
    fail(context, `card/bg contrast ${cardRatio.toFixed(3)} is visually flat`);
  }

  if (polarity === 'dark') {
    assertDarkSurfaceNotVoid(theme.bg, context);
    if (card.L <= bg.L + 0.045) {
      fail(context, `dark card does not lift off bg ΔL=${(card.L - bg.L).toFixed(3)}`);
    }
    if (card2.L <= card.L) {
      fail(context, `dark card2 is not above card`);
    }
    if (maxChannel(theme.card) < maxChannel(theme.bg) + 8) {
      fail(
        context,
        `dark card ${theme.card} is not a visible step above bg ${theme.bg} ` +
          `(maxRGB ${maxChannel(theme.card)} vs ${maxChannel(theme.bg)})`
      );
    }
  } else {
    if (isVisuallyWhite(theme.card) && isVisuallyWhite(theme.bg)) {
      fail(context, `light card flattened into white page bg=${theme.bg} card=${theme.card}`);
    }
    if (card.L >= bg.L - 0.035) {
      fail(context, `light card does not recede from bg ΔL=${(bg.L - card.L).toFixed(3)}`);
    }
    if (card2.L >= card.L) {
      fail(context, `light card2 is not below card`);
    }
  }

  if (deltaE(bg, border) < 0.06 || theme.border === theme.bg || theme.border === theme.card) {
    fail(context, `border ${theme.border} disappears against bg ${theme.bg} / card ${theme.card}`);
  }

  for (const key of ['bg', 'card', 'card2'] as const) {
    const textRatio = contrastRatio(theme.text, theme[key]);
    const mutedRatio = contrastRatio(theme.textMuted, theme[key]);
    if (textRatio < 4.5) {
      fail(context, `text ${theme.text} on ${key} ${theme[key]} ratio=${textRatio.toFixed(2)}`);
    }
    if (mutedRatio < 3.0) {
      fail(context, `muted ${theme.textMuted} on ${key} ${theme[key]} ratio=${mutedRatio.toFixed(2)}`);
    }
  }
}

export function assertHighContrastVisuals(
  theme: ThemeTokens,
  polarity: 'light' | 'dark',
  seedHue: number,
  context: string
): void {
  assertSurfaceLadder(theme, polarity, context);
  assertMutedHierarchy(theme, context);
  if (polarity === 'light') {
    assertLightMutedNotInk(theme, context);
  }
  assertBrandLooksLikeColor(theme, polarity, seedHue, context);
}
