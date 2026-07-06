/**
 * Control accuracy + color quality
 *
 * Locks in two generator properties:
 * 1. Hue-balanced vividness — brand colors occupy a similar fraction of the
 *    available sRGB gamut at every hue (no muddy teals next to neon blues).
 * 2. Accurate sliders — every saturation step produces a visible, monotone
 *    chroma change (no dead zone where the gamut clamp eats the top steps),
 *    without disturbing lightness; brightness and contrast respond
 *    monotonically per step.
 */

import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils.js';
import { toOklch, toHex, clampToSRGBGamut } from '../utils/oklch.js';
import type { ThemeTokens } from '../types.js';

const BRAND_KEYS = ['primary', 'secondary', 'accent'] as const;

const cMaxAt = (L: number, H: number) =>
  clampToSRGBGamut({ L: Math.max(0.001, Math.min(0.999, L)), C: 0.4, H }).C;

// Chroma actually representable after 8-bit hex quantization (the nominal
// gamut clamp overstates by its tolerance).
const realCMaxAt = (L: number, H: number) =>
  toOklch(toHex(clampToSRGBGamut({ L: Math.max(0.001, Math.min(0.999, L)), C: 0.4, H }))).C;

const seedForHue = (hue: number) => toHex(clampToSRGBGamut({ L: 0.55, C: 0.15, H: hue }));

const meanBrandChroma = (theme: ThemeTokens) =>
  BRAND_KEYS.reduce((sum, key) => sum + toOklch(theme[key]).C, 0) / BRAND_KEYS.length;

describe('Control accuracy', () => {
  it('keeps brand vividness balanced across hues at defaults', () => {
    const occupancies: number[] = [];
    for (let hue = 0; hue < 360; hue += 30) {
      const { light } = generateTheme('triadic', seedForHue(hue), 0, 0, 0);
      const p = toOklch(light.primary);
      const occ = p.C / Math.max(0.001, cMaxAt(p.L, p.H));
      if (occ < 0.5 || occ > 0.95) {
        throw new Error(`Primary occupancy out of band hue=${hue} occ=${occ.toFixed(2)}`);
      }
      occupancies.push(occ);
    }
    const spread = Math.max(...occupancies) - Math.min(...occupancies);
    expect(spread).toBeLessThanOrEqual(0.2);
  });

  it('makes every saturation step visible and monotone', () => {
    for (const hue of [0, 60, 120, 180, 240, 300]) {
      for (const mode of ['triadic', 'analogous'] as const) {
        const seed = seedForHue(hue);
        const themes: ThemeTokens[] = [];
        const chromas: number[] = [];
        for (let s = -5; s <= 5; s++) {
          const { light } = generateTheme(mode, seed, s, 0, 0);
          themes.push(light);
          chromas.push(meanBrandChroma(light));
        }
        const meanRealOccupancy = (theme: ThemeTokens) =>
          BRAND_KEYS.reduce((sum, key) => {
            const c = toOklch(theme[key]);
            return sum + c.C / Math.max(0.001, realCMaxAt(c.L, c.H));
          }, 0) / BRAND_KEYS.length;

        // Every step must be visible at roughly a JND — unless the palette is
        // already pressed against the true sRGB ceiling (teals/yellow-greens
        // max out at readability-constrained lightness), in which case flat
        // is allowed but going backwards is not.
        for (let i = 1; i < chromas.length; i++) {
          const delta = chromas[i] - chromas[i - 1];
          if (delta < 0.0025 && meanRealOccupancy(themes[i - 1]) < 0.9) {
            throw new Error(
              `Saturation step too small hue=${hue} mode=${mode} step=${i - 6}→${i - 5} delta=${delta.toFixed(4)}`
            );
          }
          expect(delta).toBeGreaterThanOrEqual(-0.001);
        }
        // The full slider range must cover a clearly perceptible span, or the
        // top end must genuinely exhaust the gamut.
        const positiveGain = chromas[10] - chromas[5];
        const negativeDrop = chromas[5] - chromas[0];
        if (positiveGain < 0.02) {
          expect(meanRealOccupancy(themes[10])).toBeGreaterThanOrEqual(0.9);
        }
        expect(negativeDrop).toBeGreaterThanOrEqual(0.06);
      }
    }
  });

  it('keeps saturation slider from disturbing brand lightness', () => {
    for (const hue of [0, 90, 210, 300]) {
      const seed = seedForHue(hue);
      const vivid = generateTheme('triadic', seed, 5, 0, 0).light;
      const muted = generateTheme('triadic', seed, -5, 0, 0).light;
      for (const key of BRAND_KEYS) {
        const drift = Math.abs(toOklch(vivid[key]).L - toOklch(muted[key]).L);
        if (drift > 0.1) {
          throw new Error(`Saturation moved lightness hue=${hue} key=${key} drift=${drift.toFixed(3)}`);
        }
      }
    }
  });

  it('responds monotonically to brightness per step', () => {
    const keys = ['bg', 'card', 'text'] as const;
    for (const hue of [30, 150, 270]) {
      const seed = seedForHue(hue);
      let prevLight = -Infinity;
      let prevDark = -Infinity;
      for (let b = -5; b <= 5; b++) {
        const { light, dark } = generateTheme('analogous', seed, 0, 0, b);
        const avg = (t: ThemeTokens) => keys.reduce((s, k) => s + toOklch(t[k]).L, 0) / keys.length;
        const lightAvg = avg(light);
        const darkAvg = avg(dark);
        // Small tolerance absorbs hex-quantization noise where surfaces
        // saturate against their polarity clamp.
        expect(lightAvg).toBeGreaterThan(prevLight - 0.005);
        expect(darkAvg).toBeGreaterThan(prevDark - 0.005);
        prevLight = lightAvg;
        prevDark = darkAvg;
      }
    }
  });

  it('responds monotonically to contrast per step', () => {
    const keys = ['bg', 'card', 'card2', 'text', 'textMuted', 'primary'] as const;
    const spreadOf = (t: ThemeTokens) => {
      const ls = keys.map((k) => toOklch(t[k]).L);
      return Math.max(...ls) - Math.min(...ls);
    };
    for (const hue of [60, 180, 330]) {
      const seed = seedForHue(hue);
      let prev = -Infinity;
      for (let c = -5; c <= 5; c++) {
        const { light } = generateTheme('complementary', seed, 0, c, 0);
        const spread = spreadOf(light);
        expect(spread).toBeGreaterThan(prev - 0.01);
        prev = spread;
      }
    }
  });
});
