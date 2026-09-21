import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { toOklch } from '../utils/oklch';
import { contrastRatio } from '../utils/contrast';
import type { ThemeTokens } from '../types';

const MODES = [
  'monochrome',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'compound',
  'triadic-split',
] as const;

const BRIGHTNESS_KEYS = ['bg', 'card', 'card2', 'text', 'primary', 'secondary', 'accent'] as const;
const VISIBLE_COLOR_KEYS = ['primary', 'secondary', 'accent'] as const;

function buildSeed(index: number): string {
  const hue = (index * 137.508) % 360;
  const rad = (hue * Math.PI) / 180;
  const r = Math.round(127 + 120 * Math.cos(rad));
  const g = Math.round(127 + 120 * Math.cos(rad + 2.094));
  const b = Math.round(127 + 120 * Math.cos(rad + 4.188));
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
      .join('')
  );
}

function avgLightness(theme: ThemeTokens, keys: readonly (keyof ThemeTokens)[]): number {
  let sum = 0;
  for (const key of keys) {
    sum += toOklch(theme[key]).L;
  }
  return sum / keys.length;
}

describe('Adjustment response', () => {
  it('brightness -5 and +5 create a clear perceptual gap', () => {
    for (let i = 0; i < 80; i++) {
      const mode = MODES[i % MODES.length];
      const seed = buildSeed(i + 7000);
      const sat = ((i * 3) % 5) - 2;
      const con = ((i * 7) % 5) - 2;
      const darkFirst = i % 2 === 0;

      const low = generateTheme(mode, seed, sat, con, -5, undefined, darkFirst);
      const high = generateTheme(mode, seed, sat, con, 5, undefined, darkFirst);

      const lightDelta = avgLightness(high.light, BRIGHTNESS_KEYS) - avgLightness(low.light, BRIGHTNESS_KEYS);
      const darkDelta = avgLightness(high.dark, BRIGHTNESS_KEYS) - avgLightness(low.dark, BRIGHTNESS_KEYS);

      if (lightDelta < 0.20) {
        throw new Error(
          `Light brightness gap too small mode=${mode} seed=${seed} delta=${lightDelta.toFixed(3)}`
        );
      }
      if (darkDelta < 0.16) {
        throw new Error(
          `Dark brightness gap too small mode=${mode} seed=${seed} delta=${darkDelta.toFixed(3)}`
        );
      }
    }
  });

  it('contrast remains effective even when brightness is +5', () => {
    for (let i = 0; i < 80; i++) {
      const mode = MODES[i % MODES.length];
      const seed = buildSeed(i + 9000);
      const sat = ((i * 5) % 5) - 2;
      const darkFirst = i % 3 === 0;

      const lowContrast = generateTheme(mode, seed, sat, -5, 5, undefined, darkFirst);
      const highContrast = generateTheme(mode, seed, sat, 5, 5, undefined, darkFirst);

      const lightTextGain =
        contrastRatio(highContrast.light.text, highContrast.light.bg) -
        contrastRatio(lowContrast.light.text, lowContrast.light.bg);
      const darkTextGain =
        contrastRatio(highContrast.dark.text, highContrast.dark.bg) -
        contrastRatio(lowContrast.dark.text, lowContrast.dark.bg);
      const lightCardGap =
        Math.abs(toOklch(highContrast.light.card).L - toOklch(highContrast.light.bg).L) -
        Math.abs(toOklch(lowContrast.light.card).L - toOklch(lowContrast.light.bg).L);
      const darkCardGap =
        Math.abs(toOklch(highContrast.dark.card).L - toOklch(highContrast.dark.bg).L) -
        Math.abs(toOklch(lowContrast.dark.card).L - toOklch(lowContrast.dark.bg).L);

      if (lightTextGain < 1.2 && lightCardGap < 0.02) {
        throw new Error(
          `Light contrast weak at bri+5 mode=${mode} seed=${seed} textGain=${lightTextGain.toFixed(2)} cardGap=${lightCardGap.toFixed(3)}`
        );
      }
      if (darkTextGain < 1.0 && darkCardGap < 0.02) {
        throw new Error(
          `Dark contrast weak at bri+5 mode=${mode} seed=${seed} textGain=${darkTextGain.toFixed(2)} cardGap=${darkCardGap.toFixed(3)}`
        );
      }
    }
  });

  it('keeps chromatic tokens visible at extreme brightness in both modes', () => {
    const minVisibilityRatio = 2.4;
    for (let i = 0; i < 80; i++) {
      const mode = MODES[i % MODES.length];
      const seed = buildSeed(i + 12000);

      // Bright light side should not wash out semantic colors.
      const highBrightness = generateTheme(mode, seed, 3, -1, 5, undefined, false);
      for (const key of VISIBLE_COLOR_KEYS) {
        const ratio = contrastRatio(highBrightness.light[key], highBrightness.light.bg);
        if (ratio < minVisibilityRatio) {
          throw new Error(
            `Light chroma visibility too low mode=${mode} seed=${seed} key=${key} ratio=${ratio.toFixed(2)}`
          );
        }
      }

      // Very dark side should also keep semantic colors readable against dark bg.
      const lowBrightness = generateTheme(mode, seed, 3, -1, -5, undefined, false);
      for (const key of VISIBLE_COLOR_KEYS) {
        const ratio = contrastRatio(lowBrightness.dark[key], lowBrightness.dark.bg);
        if (ratio < minVisibilityRatio) {
          throw new Error(
            `Dark chroma visibility too low mode=${mode} seed=${seed} key=${key} ratio=${ratio.toFixed(2)}`
          );
        }
      }
    }
  });

  it('preserves light-side brand visibility for high-brightness low-contrast cases', () => {
    const seed = '#9a4b00';
    const mode = 'compound';
    const sat = 5;
    const bri = 2;
    const minBrandRatio = 2.55;
    for (const con of [-3, -4, -5]) {
      const { light } = generateTheme(mode, seed, sat, con, bri, undefined, false);
      for (const key of VISIBLE_COLOR_KEYS) {
        const ratio = contrastRatio(light[key], light.bg);
        if (ratio < minBrandRatio) {
          throw new Error(
            `Brand visibility regression con=${con} key=${key} ratio=${ratio.toFixed(2)} bg=${light.bg} token=${light[key]}`
          );
        }
      }
    }
  });

  it('keeps light/dark semantic contrast feel aligned in extreme high-contrast dark-brightness cases', () => {
    const { light, dark } = generateTheme('random', '#a8372a', -4, 5, -4, undefined, false);
    const keys: Array<'primary' | 'secondary' | 'accent'> = ['primary', 'secondary', 'accent'];

    for (const key of keys) {
      const lightRatio = Math.min(
        contrastRatio(light[key], light.bg),
        contrastRatio(light[key], light.card)
      );
      const darkRatio = Math.min(
        contrastRatio(dark[key], dark.bg),
        contrastRatio(dark[key], dark.card)
      );
      const delta = Math.abs(lightRatio - darkRatio);
      if (delta > 3.6) {
        throw new Error(
          `Semantic contrast mismatch key=${key} light=${lightRatio.toFixed(2)} dark=${darkRatio.toFixed(2)} delta=${delta.toFixed(2)}`
        );
      }
    }
  });
});
