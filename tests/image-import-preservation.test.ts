import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { selectForegroundHex } from '../utils/contrast';

const IMPORTED_KEYS = [
  'bg',
  'card',
  'text',
  'textMuted',
  'textOnColor',
  'primary',
  'secondary',
  'accent',
  'good',
  'bad',
] as const;

const LIGHT_IMAGE_PALETTE = [
  '#ece8df',
  '#d9d0c3',
  '#2b231d',
  '#6f5f52',
  '#fffaf2',
  '#b04040',
  '#ad8f7d',
  '#d4c6a3',
  '#9aa57a',
  '#7a6f95',
];

const DARK_IMAGE_PALETTE = [
  '#222222',
  '#2f484a',
  '#9a7f82',
  '#91816e',
  '#43445a',
  '#b04040',
  '#ad8f7d',
  '#d4c6a3',
  '#b3a587',
  '#475a70',
];

describe('Image import preservation', () => {
  it('keeps all 10 imported slots exact in light-first mode across slider extremes for light palettes', () => {
    const high = generateTheme('image', '#006fa8', 5, -1, 5, LIGHT_IMAGE_PALETTE, false);
    const low = generateTheme('image', '#006fa8', -5, 5, -5, LIGHT_IMAGE_PALETTE, false);

    for (let i = 0; i < IMPORTED_KEYS.length; i++) {
      const key = IMPORTED_KEYS[i];
      const expected = LIGHT_IMAGE_PALETTE[i];
      expect(high.light[key]).toBe(expected);
      expect(low.light[key]).toBe(expected);
    }

    // Remaining 10 tokens are derived from imported foundation.
    expect(high.light.primaryFg).toBe(selectForegroundHex(high.light.primary));
    expect(high.light.secondaryFg).toBe(selectForegroundHex(high.light.secondary));
    expect(high.light.accentFg).toBe(selectForegroundHex(high.light.accent));
    expect(high.light.goodFg).toBe(selectForegroundHex(high.light.good));
    expect(high.light.warnFg).toBe(selectForegroundHex(high.light.warn));
    expect(high.light.badFg).toBe(selectForegroundHex(high.light.bad));
    expect(high.light.card2).toMatch(/^#[0-9a-f]{6}$/);
    expect(high.light.border).toMatch(/^#[0-9a-f]{6}$/);
    expect(high.light.ring).toMatch(/^#[0-9a-f]{6}$/);
    expect(high.light.warn).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('keeps all 10 imported slots exact in dark-first mode', () => {
    const generated = generateTheme('image', '#006fa8', 3, 2, -3, DARK_IMAGE_PALETTE, true);

    for (let i = 0; i < IMPORTED_KEYS.length; i++) {
      const key = IMPORTED_KEYS[i];
      expect(generated.dark[key]).toBe(DARK_IMAGE_PALETTE[i]);
    }
  });

  it('applies imports to explicit dark source side when requested', () => {
    const generated = generateTheme('image', '#006fa8', -3, -5, -3, DARK_IMAGE_PALETTE, false, undefined, undefined, undefined, 'dark');

    for (let i = 0; i < IMPORTED_KEYS.length; i++) {
      const key = IMPORTED_KEYS[i];
      expect(generated.dark[key]).toBe(DARK_IMAGE_PALETTE[i]);
    }
    expect(generated.light.bg).not.toBe(DARK_IMAGE_PALETTE[0]);
  });

  it('defaults import source side to light when darkFirst is off', () => {
    const generated = generateTheme('image', '#006fa8', -3, -5, -3, DARK_IMAGE_PALETTE, false);

    for (let i = 0; i < IMPORTED_KEYS.length; i++) {
      const key = IMPORTED_KEYS[i];
      expect(generated.light[key]).toBe(DARK_IMAGE_PALETTE[i]);
    }
  });

  it('derives textOnColor from primary when slot is unchecked', () => {
    const withGap = [...LIGHT_IMAGE_PALETTE];
    withGap[4] = ''; // textOnColor unchecked

    const generated = generateTheme('image', '#006fa8', 2, 0, 1, withGap, false);

    expect(generated.light.textOnColor).toBe(generated.light.primaryFg);

    for (const i of [0, 1, 2, 3, 5, 6, 7, 8, 9]) {
      const key = IMPORTED_KEYS[i];
      expect(generated.light[key]).toBe(LIGHT_IMAGE_PALETTE[i]);
    }
  });
});
