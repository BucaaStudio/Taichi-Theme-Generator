import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { contrastRatio } from '../utils/contrast';

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

describe('Readability guardrails', () => {
  it('keeps text readable against core surfaces across generated themes', () => {
    for (let i = 0; i < 140; i++) {
      const mode = MODES[i % MODES.length];
      const seed = buildSeed(i + 4000);
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

      const checkTheme = (theme: typeof light, themeName: 'light' | 'dark') => {
        const textMin = themeName === 'dark' ? 5 : 3.8;
        const mutedMin = themeName === 'dark' ? 3.4 : 2.6;
        const surfaces = [theme.bg, theme.card, theme.card2];

        for (const surface of surfaces) {
          const textRatio = contrastRatio(theme.text, surface);
          if (textRatio < textMin) {
            throw new Error(
              `text contrast fail theme=${themeName} mode=${mode} seed=${seed} sat=${saturation} con=${contrast} bri=${brightness} ratio=${textRatio.toFixed(2)} min=${textMin}`
            );
          }

          const mutedRatio = contrastRatio(theme.textMuted, surface);
          if (mutedRatio < mutedMin) {
            throw new Error(
              `textMuted contrast fail theme=${themeName} mode=${mode} seed=${seed} sat=${saturation} con=${contrast} bri=${brightness} ratio=${mutedRatio.toFixed(2)} min=${mutedMin}`
            );
          }
        }
      };

      checkTheme(light, 'light');
      checkTheme(dark, 'dark');
    }
  });
});
