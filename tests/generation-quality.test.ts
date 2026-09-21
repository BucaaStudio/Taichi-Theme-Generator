import { describe, expect, it } from '@jest/globals';
import { assignImageSlots, generateTheme, mergeLockedSlots, parseToHex, readabilityFloors } from '../utils/colorUtils';
import { contrastRatio } from '../utils/contrast';
import { hueDifference, toOklch } from '../utils/oklch';
import { seedFromHue, surfaceHueFromWarmth, warmthFromSeed } from '../utils/paletteEngine';
import { assertHighContrastVisuals, describeTheme } from './visualHelpers';

describe('Seed replay', () => {
  it('replays an unseeded generate from the returned seed', () => {
    const first = generateTheme('analogous');
    const replay = generateTheme('analogous', first.seed);

    expect(replay.seed).toBe(first.seed);
    expect(replay.mode).toBe('analogous');
    expect(replay.light.primary).toBe(first.light.primary);
    expect(replay.dark.primary).toBe(first.dark.primary);
    expect(replay.light.bg).toBe(first.light.bg);
    expect(replay.dark.card).toBe(first.dark.card);
  });

  it('is deterministic for the same explicit seed', () => {
    const a = generateTheme('triadic', '#3a5cb8', 1, -1, 2);
    const b = generateTheme('triadic', '#3a5cb8', 1, -1, 2);
    expect(a.light).toEqual(b.light);
    expect(a.dark).toEqual(b.dark);
    expect(a.seed).toBe('#3a5cb8');
  });

  it('resolves random mode to a concrete harmony and replays it', () => {
    const first = generateTheme('random', '#3a5cb8');
    expect(first.mode).not.toBe('random');
    const replay = generateTheme(first.mode, first.seed);
    expect(replay.light.primary).toBe(first.light.primary);
    expect(replay.dark.secondary).toBe(first.dark.secondary);
  });
});

describe('Surface-aware brand colors', () => {
  it('keeps primary visible on the background at defaults', () => {
    for (const hue of [0, 40, 60, 120, 200, 280]) {
      const seed = parseToHex(`oklch(0.55 0.15 ${hue})`, 'oklch');
      const { light, dark } = generateTheme('analogous', seed!, 0, 0, 0);
      expect(contrastRatio(light.primary, light.bg)).toBeGreaterThanOrEqual(2.8);
      expect(contrastRatio(dark.primary, dark.bg)).toBeGreaterThanOrEqual(2.8);
    }
  });
});

describe('Locked slot overrides', () => {
  it('keeps an overridden primary exact and builds nearby hues around it', () => {
    const lockedPrimary = '#2f6fed';
    const overrides = ['', '', '', '', '', lockedPrimary, '', '', '', ''];
    const { light } = generateTheme('complementary', '#884422', 0, 0, 0, overrides);

    expect(light.primary.toLowerCase()).toBe(lockedPrimary);
    const primaryHue = toOklch(light.primary).H;
    const secondaryHue = toOklch(light.secondary).H;
    expect(hueDifference(primaryHue, secondaryHue)).toBeGreaterThan(90);
  });

  it('merges locked tokens onto an existing override list', () => {
    const source = generateTheme('analogous', '#336699').light;
    const merged = mergeLockedSlots(
      ['', '', '', '', '', '#ff0000', '', '', '', ''],
      { bg: true, primary: true },
      source
    );

    expect(merged).toBeDefined();
    expect(merged![0]).toBe(source.bg);
    expect(merged![5]).toBe(source.primary);
  });
});

describe('WCAG contrast floors', () => {
  it('uses AA text and muted floors at default contrast', () => {
    expect(readabilityFloors(0, false)).toEqual({ text: 4.5, muted: 3.0 });
    expect(readabilityFloors(0, true)).toEqual({ text: 4.5, muted: 3.0 });
    expect(readabilityFloors(-5, false).text).toBeLessThan(4.5);
    expect(readabilityFloors(-5, false).text).toBeGreaterThanOrEqual(2.4);
    expect(readabilityFloors(-5, false).text).toBeLessThan(readabilityFloors(-4, false).text);
  });

  it('meets AA on generated defaults', () => {
    const { light, dark } = generateTheme('analogous', '#3a5cb8', 0, 0, 0);
    expect(contrastRatio(light.text, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.textMuted, light.bg)).toBeGreaterThanOrEqual(3.0);
    expect(contrastRatio(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.textMuted, dark.bg)).toBeGreaterThanOrEqual(3.0);
  });
});

describe('High contrast surface ladder', () => {
  it('keeps cards visible and muted distinct at +3 +4 +5, especially in dark mode', () => {
    const seedHue = toOklch('#3a5cb8').H;
    for (const contrast of [3, 4, 5]) {
      const { light, dark } = generateTheme('analogous', '#3a5cb8', 0, contrast, 0);
      assertHighContrastVisuals(light, 'light', seedHue, describeTheme(light, { contrast, side: 'light' }));
      assertHighContrastVisuals(dark, 'dark', seedHue, describeTheme(dark, { contrast, side: 'dark' }));
    }
  });
});

describe('Brand-tinted neutrals', () => {
  it('mixes surface hue toward warm/cool instead of snapping', () => {
    const mixed = surfaceHueFromWarmth(200, 0.3);
    expect(hueDifference(mixed, 200)).toBeGreaterThan(5);
    expect(hueDifference(mixed, 60)).toBeGreaterThan(5);
    expect(hueDifference(mixed, 200)).toBeLessThan(hueDifference(200, 60));
  });

  it('keeps generated surfaces related to the brand hue', () => {
    const seed = seedFromHue(200);
    const { light } = generateTheme('analogous', seed, 0, 0, 0);
    const bgHue = toOklch(light.bg).H;
    const expected = surfaceHueFromWarmth(200, warmthFromSeed(seed));
    expect(hueDifference(bgHue, expected)).toBeLessThan(12);
    expect(hueDifference(bgHue, 200)).toBeLessThan(90);
  });
});

describe('On-palette status hues', () => {
  it('keeps status colors conventional green and red in every harmony', () => {
    const seed = seedFromHue(250);
    for (const mode of ['monochrome', 'analogous', 'complementary', 'triadic'] as const) {
      const { light, dark } = generateTheme(mode, seed, 0, 0, 0);
      for (const side of [light, dark]) {
        expect(hueDifference(toOklch(side.good).H, 148)).toBeLessThanOrEqual(14);
        expect(hueDifference(toOklch(side.bad).H, 27)).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe('Image role assignment', () => {
  it('assigns surfaces, brand, and status from OKLCH roles', () => {
    const slots = assignImageSlots(
      [
        { hex: '#f8fafc', count: 80 },
        { hex: '#e2e8f0', count: 40 },
        { hex: '#1e293b', count: 30 },
        { hex: '#64748b', count: 20 },
        { hex: '#2563eb', count: 50 },
        { hex: '#10b981', count: 18 },
        { hex: '#f59e0b', count: 14 },
        { hex: '#ef4444', count: 16 },
      ],
      false
    );

    expect(slots[0].toLowerCase()).toBe('#f8fafc');
    expect(slots[2].toLowerCase()).toBe('#1e293b');
    expect(slots[5].toLowerCase()).toBe('#2563eb');
    expect(slots[8].toLowerCase()).toBe('#10b981');
    expect(slots[9].toLowerCase()).toBe('#ef4444');
  });
});
