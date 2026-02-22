import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { OklchColor, clampToSRGBGamut, toOklch } from '../utils/oklch';

const HARMONY_MODES = [
  'monochrome',
  'analogous',
  'complementary',
  'split-complementary',
  'triadic',
  'tetradic',
  'compound',
  'triadic-split',
] as const;

const CHROMATIC_KEYS = ['primary', 'secondary', 'accent', 'good', 'warn', 'bad'] as const;

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

function maxGamutChromaAt(lightness: number, hue: number): number {
  const safeL = Math.max(0.001, Math.min(0.999, lightness));
  return clampToSRGBGamut({ L: safeL, C: 0.4, H: hue }).C;
}

function relativeChroma(color: OklchColor): number {
  const max = Math.max(0.001, maxGamutChromaAt(color.L, color.H));
  return color.C / max;
}

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

describe('Palette parity', () => {
  it('keeps the screenshot seed close between modes at defaults', () => {
    const { light, dark } = generateTheme('random', '#3a5cb8', 0, 0, 0, undefined, false);

    for (const key of CHROMATIC_KEYS) {
      const lightColor = toOklch(light[key]);
      const darkColor = toOklch(dark[key]);
      const hueDelta = hueDistance(lightColor.H, darkColor.H);
      const chromaDelta = Math.abs(lightColor.C - darkColor.C);
      expect(hueDelta).toBeLessThanOrEqual(6);
      expect(chromaDelta).toBeLessThanOrEqual(0.02);
    }
  });

  it('keeps semantic hue alignment across light and dark modes', () => {
    for (let i = 0; i < 120; i++) {
      const mode = HARMONY_MODES[i % HARMONY_MODES.length];
      const seed = buildSeed(i);
      const saturation = (i % 11) - 5;
      const contrast = ((i * 3) % 11) - 5;
      const brightness = ((i * 7) % 11) - 5;
      const darkFirst = i % 2 === 0;

      const { light, dark } = generateTheme(
        mode,
        seed,
        saturation,
        contrast,
        brightness,
        undefined,
        darkFirst
      );

      for (const key of CHROMATIC_KEYS) {
        const lightColor = toOklch(light[key]);
        const darkColor = toOklch(dark[key]);
        if (Math.max(lightColor.C, darkColor.C) < 0.025) {
          continue; // Hue is unstable/meaningless when both colors are near-neutral.
        }
        const hueDelta = hueDistance(lightColor.H, darkColor.H);
        if (hueDelta > 10) {
          throw new Error(
            `Hue drift mode=${mode} seed=${seed} darkFirst=${darkFirst} key=${key} sat=${saturation} con=${contrast} bri=${brightness} delta=${hueDelta.toFixed(2)} light(L=${lightColor.L.toFixed(3)},C=${lightColor.C.toFixed(3)},H=${lightColor.H.toFixed(2)}) dark(L=${darkColor.L.toFixed(3)},C=${darkColor.C.toFixed(3)},H=${darkColor.H.toFixed(2)})`
          );
        }
      }
    }
  });

  it('keeps semantic saturation occupancy reasonably close', () => {
    for (let i = 0; i < 120; i++) {
      const mode = HARMONY_MODES[i % HARMONY_MODES.length];
      const seed = buildSeed(i + 1000);
      // Moderate adjustments are the primary UX path for parity expectations.
      const saturation = (i % 5) - 2;
      const contrast = ((i * 5) % 5) - 2;
      const brightness = ((i * 9) % 5) - 2;
      const darkFirst = i % 3 === 0;

      const { light, dark } = generateTheme(
        mode,
        seed,
        saturation,
        contrast,
        brightness,
        undefined,
        darkFirst
      );

      for (const key of CHROMATIC_KEYS) {
        const lightColor = toOklch(light[key]);
        const darkColor = toOklch(dark[key]);
        const lightRelative = relativeChroma(lightColor);
        const darkRelative = relativeChroma(darkColor);
        const relativeDelta = Math.abs(lightRelative - darkRelative);
        const absoluteDelta = Math.abs(lightColor.C - darkColor.C);
        const nearClip =
          lightColor.L < 0.2 ||
          lightColor.L > 0.8 ||
          darkColor.L < 0.2 ||
          darkColor.L > 0.8;
        const nearNeutral = Math.max(lightColor.C, darkColor.C) < 0.03;

        if (nearNeutral && absoluteDelta > 0.018) {
          throw new Error(
            `Near-neutral chroma drift mode=${mode} seed=${seed} darkFirst=${darkFirst} key=${key} sat=${saturation} con=${contrast} bri=${brightness} absDelta=${absoluteDelta.toFixed(3)}`
          );
        }

        if (!nearNeutral && nearClip && absoluteDelta > 0.08) {
          throw new Error(
            `Near-clip chroma drift mode=${mode} seed=${seed} darkFirst=${darkFirst} key=${key} sat=${saturation} con=${contrast} bri=${brightness} absDelta=${absoluteDelta.toFixed(3)}`
          );
        }

        if (!nearNeutral && !nearClip && absoluteDelta > 0.045) {
          throw new Error(
            `Absolute chroma drift mode=${mode} seed=${seed} darkFirst=${darkFirst} key=${key} sat=${saturation} con=${contrast} bri=${brightness} absDelta=${absoluteDelta.toFixed(3)} light(L=${lightColor.L.toFixed(3)},C=${lightColor.C.toFixed(3)}) dark(L=${darkColor.L.toFixed(3)},C=${darkColor.C.toFixed(3)})`
          );
        }

        if (!nearNeutral && !nearClip && relativeDelta > 0.35) {
          throw new Error(
            `Chroma drift mode=${mode} seed=${seed} darkFirst=${darkFirst} key=${key} sat=${saturation} con=${contrast} bri=${brightness} delta=${relativeDelta.toFixed(3)} light(L=${lightColor.L.toFixed(3)},C=${lightColor.C.toFixed(3)},rel=${lightRelative.toFixed(3)}) dark(L=${darkColor.L.toFixed(3)},C=${darkColor.C.toFixed(3)},rel=${darkRelative.toFixed(3)})`
          );
        }
      }
    }
  });
});
