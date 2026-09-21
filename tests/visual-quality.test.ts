import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { clampToSRGBGamut, deltaE, toHex, toOklch } from '../utils/oklch';
import {
  HARMONY_MODES,
  HIGH_CONTRAST_STEPS,
  VISUAL_HUES,
  assertDarkSurfaceNotVoid,
  assertHighContrastVisuals,
  describeTheme,
  isVisuallyVoid,
  maxChannel,
} from './visualHelpers';

const seedForHue = (hue: number): string =>
  toHex(clampToSRGBGamut({ L: 0.55, C: 0.15, H: hue }));

describe('Visual predicates', () => {
  it('rejects OLED-black hexes that used to sneak past !== #000000', () => {
    expect(isVisuallyVoid('#000000')).toBe(true);
    expect(isVisuallyVoid('#020404')).toBe(true);
    expect(isVisuallyVoid('#030607')).toBe(true);
    expect(isVisuallyVoid('#050606')).toBe(true);
    expect(isVisuallyVoid('#0d1013')).toBe(false);
    expect(isVisuallyVoid('#151617')).toBe(false);
    expect(() => assertDarkSurfaceNotVoid('#030607', 'regression')).toThrow(/void/);
    expect(() => assertDarkSurfaceNotVoid('#0d1013', 'regression')).not.toThrow();
  });
});

describe('High contrast visuals', () => {
  it('keeps +3 +4 +5 as usable UI themes, especially in dark mode', () => {
    for (const mode of HARMONY_MODES) {
      for (const hue of VISUAL_HUES) {
        const seed = seedForHue(hue);
        const seedHue = toOklch(seed).H;
        for (const darkFirst of [false, true]) {
          for (const contrast of HIGH_CONTRAST_STEPS) {
            const { light, dark } = generateTheme(mode, seed, 0, contrast, 0, undefined, darkFirst);
            assertHighContrastVisuals(
              light,
              'light',
              seedHue,
              describeTheme(light, { mode, seed, contrast, darkFirst, side: 'light' })
            );
            assertHighContrastVisuals(
              dark,
              'dark',
              seedHue,
              describeTheme(dark, { mode, seed, contrast, darkFirst, side: 'dark' })
            );
          }
        }
      }
    }
  });

  it('makes each high-contrast step a visible change on the surface stack', () => {
    for (const mode of ['analogous', 'complementary', 'triadic', 'monochrome'] as const) {
      for (const hue of [0, 60, 200, 280] as const) {
        const seed = seedForHue(hue);
        const themes = [0, 3, 4, 5].map((contrast) => ({
          contrast,
          ...generateTheme(mode, seed, 0, contrast, 0),
        }));

        const cardDelta = (theme: (typeof themes)[number], side: 'light' | 'dark') =>
          deltaE(toOklch(theme[side].bg), toOklch(theme[side].card));

        for (const side of ['light', 'dark'] as const) {
          const d0 = cardDelta(themes[0], side);
          const d3 = cardDelta(themes[1], side);
          const d4 = cardDelta(themes[2], side);
          const d5 = cardDelta(themes[3], side);
          if (d3 < d0 + 0.012) {
            throw new Error(
              `${side} +3 is not a visible step up from 0 mode=${mode} hue=${hue} d0=${d0.toFixed(3)} d3=${d3.toFixed(3)}`
            );
          }
          if (d4 < d3 - 0.002) {
            throw new Error(
              `${side} +4 recedes from +3 mode=${mode} hue=${hue} d3=${d3.toFixed(3)} d4=${d4.toFixed(3)}`
            );
          }
          if (d5 < d4 - 0.002) {
            throw new Error(
              `${side} +5 recedes from +4 mode=${mode} hue=${hue} d4=${d4.toFixed(3)} d5=${d5.toFixed(3)}`
            );
          }
          if (d5 < d3 + 0.008) {
            throw new Error(
              `${side} +5 is not clearly stronger than +3 mode=${mode} hue=${hue} d3=${d3.toFixed(3)} d5=${d5.toFixed(3)}`
            );
          }

          const zero = themes[0][side];
          const plus5 = themes[3][side];
          if (zero.bg === plus5.bg && zero.card === plus5.card && zero.primary === plus5.primary) {
            throw new Error(`${side} +5 is identical to defaults mode=${mode} hue=${hue}`);
          }
        }

        expect(maxChannel(themes[3].dark.bg)).toBeGreaterThanOrEqual(14);
      }
    }
  });

  it('keeps the screenshot seed charcoal in dark mode at +5', () => {
    const { light, dark } = generateTheme('analogous', '#3a5cb8', 0, 5, 0);
    const seedHue = toOklch('#3a5cb8').H;
    assertHighContrastVisuals(light, 'light', seedHue, describeTheme(light, { side: 'light', seed: '#3a5cb8' }));
    assertHighContrastVisuals(dark, 'dark', seedHue, describeTheme(dark, { side: 'dark', seed: '#3a5cb8' }));
    expect(dark.bg.toLowerCase()).not.toBe('#030607');
    expect(maxChannel(dark.bg)).toBeGreaterThanOrEqual(16);
    expect(toOklch(dark.card).L - toOklch(dark.bg).L).toBeGreaterThanOrEqual(0.08);
  });
});

describe('Default dark visuals', () => {
  it('starts from charcoal, not a black void', () => {
    for (const hue of VISUAL_HUES) {
      const seed = seedForHue(hue);
      const { dark } = generateTheme('analogous', seed, 0, 0, 0);
      assertDarkSurfaceNotVoid(dark.bg, describeTheme(dark, { seed, side: 'dark', contrast: 0 }));
      expect(maxChannel(dark.bg)).toBeGreaterThanOrEqual(18);
      expect(deltaE(toOklch(dark.bg), toOklch(dark.card))).toBeGreaterThanOrEqual(0.035);
    }
  });
});
