import { describe, expect, it } from '@jest/globals';
import {
  MAX_THEME_PROMPT_LENGTH,
  AI_TOKEN_KEYS,
  buildThemeFromIntent,
  clampThemePromptIntent,
  decodeAiBase,
  encodeAiBase,
  normalizeSeedHex,
  normalizeThemePrompt,
  normalizeThemeRequest,
} from '../utils/promptTheme';
import { contrastRatio } from '../utils/contrast';

const LIGHT = {
  bg: '#fff6e5', card: '#fffaf0', card2: '#f7ead0', border: '#e6d3ad',
  text: '#2a1210', textMuted: '#6e4f45',
  primary: '#c8102e', secondary: '#d99a00', accent: '#8b0000',
  good: '#2e7d32', warn: '#b26a00', bad: '#b3261e',
};
const OPTIONS = {
  borderWidth: 1, shadowStrength: 2, shadowOpacity: 20, radius: 3, gradients: false, darkFirst: false,
  saturation: 2, contrast: 1, brightness: 0,
};
const DARK = {
  bg: '#1c0d0d', card: '#2a1414', card2: '#361b1b', border: '#4a2626',
  text: '#fdeee0', textMuted: '#c9a79a',
  primary: '#ff4d5e', secondary: '#f2b632', accent: '#ff8a65',
  good: '#66bb6a', warn: '#ffb74d', bad: '#ff6b6b',
};

describe('Theme prompt parsing', () => {
  it('rejects empty and oversized prompts', () => {
    expect(normalizeThemePrompt('')).toMatchObject({ code: 'INVALID_PROMPT' });
    expect(normalizeThemePrompt('   ')).toMatchObject({ code: 'INVALID_PROMPT' });
    expect(normalizeThemePrompt('x'.repeat(MAX_THEME_PROMPT_LENGTH + 1))).toMatchObject({
      code: 'PROMPT_TOO_LONG',
    });
  });

  it('trims a usable prompt', () => {
    expect(normalizeThemePrompt('  a bright colorful theme that feels like spring  ')).toEqual({
      prompt: 'a bright colorful theme that feels like spring',
    });
  });

  it('normalizes seed hex', () => {
    expect(normalizeSeedHex('7EC850')).toBe('#7ec850');
    expect(normalizeSeedHex('#F4A6C8')).toBe('#f4a6c8');
    expect(normalizeSeedHex('not-a-color')).toBeNull();
  });

  it('accepts an image alone, with text, and rejects bad images', () => {
    const image = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    expect(normalizeThemeRequest({ image })).toEqual({ prompt: '', image: { mediaType: 'image/jpeg', data: '/9j/4AAQSkZJRg==' } });
    expect(normalizeThemeRequest({ prompt: ' calmer ', image })).toMatchObject({ prompt: 'calmer' });
    expect(normalizeThemeRequest({ prompt: 'spring' })).toEqual({ prompt: 'spring', image: null });
    expect(normalizeThemeRequest({})).toMatchObject({ code: 'INVALID_PROMPT' });
    expect(normalizeThemeRequest({ image: 'https://example.com/a.png' })).toMatchObject({ code: 'INVALID_IMAGE' });
    expect(normalizeThemeRequest({ image: 'data:image/svg+xml;base64,AAAA' })).toMatchObject({ code: 'INVALID_IMAGE' });
    expect(normalizeThemeRequest({ image: `data:image/png;base64,${'A'.repeat(2_000_001)}` })).toMatchObject({ code: 'IMAGE_TOO_LARGE' });
  });

  it('normalizes model tokens', () => {
    const intent = clampThemePromptIntent({ light: { ...LIGHT, primary: 'C8102E' }, dark: DARK, options: OPTIONS, rationale: ' Red and gold. ' });
    expect(intent.light.primary).toBe('#c8102e');
    expect(intent.rationale).toBe('Red and gold.');
    expect(clampThemePromptIntent({ light: LIGHT, dark: DARK, options: { ...OPTIONS, radius: 9.6, saturation: -12 }, rationale: 'x' }).options)
      .toMatchObject({ radius: 5, saturation: -5 });
    expect(() => clampThemePromptIntent({ light: { ...LIGHT, bg: 'cream' }, dark: DARK, options: OPTIONS, rationale: 'x' })).toThrow();
  });
});

describe('Theme prompt application', () => {
  it('uses the model tokens as-is and derives foregrounds', () => {
    const { light, dark, mode } = buildThemeFromIntent({ light: LIGHT, dark: DARK, options: OPTIONS, rationale: 'x' });
    expect(mode).toBe('ai');
    for (const key of AI_TOKEN_KEYS) {
      expect(light[key]).toBe(LIGHT[key]);
      expect(dark[key]).toBe(DARK[key]);
    }
    expect(contrastRatio(light.primaryFg, light.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('only corrects unreadable body text', () => {
    const { light } = buildThemeFromIntent({ light: { ...LIGHT, text: '#fff0d0' }, dark: DARK, options: OPTIONS, rationale: 'x' });
    expect(contrastRatio(light.text, light.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('round-trips through the share URL encoding', () => {
    const base = buildThemeFromIntent({ light: LIGHT, dark: DARK, options: OPTIONS, rationale: 'x' });
    expect(decodeAiBase(encodeAiBase(base))).toEqual({ light: base.light, dark: base.dark, levels: base.levels });
    expect(decodeAiBase('nope')).toBeNull();
  });
});
