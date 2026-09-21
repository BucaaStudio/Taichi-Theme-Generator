import type { ThemeTokens } from '../types.js';
import { contrastRatio, selectForegroundHex } from './contrast.js';
import { clampToSRGBGamut, toHex, toOklch } from './oklch.js';

export interface ContrastCheck {
  label: string;
  fg: keyof ThemeTokens;
  bg: keyof ThemeTokens;
  // WCAG AA: 4.5 for body text, 3 for large text and UI components.
  required: number;
}

export interface ContrastResult extends ContrastCheck {
  ratio: number;
  pass: boolean;
}

export const CONTRAST_CHECKS: ContrastCheck[] = [
  { label: 'Text on background', fg: 'text', bg: 'bg', required: 4.5 },
  { label: 'Text on card', fg: 'text', bg: 'card', required: 4.5 },
  { label: 'Muted text on background', fg: 'textMuted', bg: 'bg', required: 4.5 },
  { label: 'Muted text on card', fg: 'textMuted', bg: 'card', required: 4.5 },
  { label: 'Primary on background', fg: 'primary', bg: 'bg', required: 3 },
  { label: 'Primary on card', fg: 'primary', bg: 'card', required: 3 },
  { label: 'Secondary on card', fg: 'secondary', bg: 'card', required: 3 },
  { label: 'Accent on card', fg: 'accent', bg: 'card', required: 3 },
  { label: 'Success on card', fg: 'good', bg: 'card', required: 3 },
  { label: 'Warning on card', fg: 'warn', bg: 'card', required: 3 },
  { label: 'Error on card', fg: 'bad', bg: 'card', required: 3 },
  { label: 'Label on primary', fg: 'primaryFg', bg: 'primary', required: 4.5 },
  { label: 'Label on secondary', fg: 'secondaryFg', bg: 'secondary', required: 4.5 },
  { label: 'Label on accent', fg: 'accentFg', bg: 'accent', required: 4.5 },
];

export function auditContrast(tokens: ThemeTokens): ContrastResult[] {
  return CONTRAST_CHECKS.map((check) => {
    const ratio = contrastRatio(tokens[check.fg], tokens[check.bg]);
    return { ...check, ratio, pass: ratio >= check.required };
  });
}

// Walk a color's lightness away from the surface, keeping hue and chroma, until
// it clears the ratio. Returns null if even the extreme cannot.
function nudgeToContrast(fgHex: string, bgHex: string, required: number): string | null {
  const fg = toOklch(fgHex);
  const direction = toOklch(bgHex).L > 0.5 ? -1 : 1;
  for (let step = 1; step <= 60; step++) {
    const L = fg.L + direction * step * 0.015;
    if (L < 0.02 || L > 0.99) break;
    const candidate = toHex(clampToSRGBGamut({ L, C: fg.C, H: fg.H }));
    if (contrastRatio(candidate, bgHex) >= required) return candidate;
  }
  return null;
}

// Smallest set of token changes that makes every check pass. Foreground colors
// move; surfaces stay where the designer (or the AI) put them.
export function fixContrast(tokens: ThemeTokens): Partial<ThemeTokens> {
  const working = { ...tokens };
  const updates: Partial<ThemeTokens> = {};
  // Two passes: a color checked against both bg and card may need the second.
  for (let pass = 0; pass < 2; pass++) {
    for (const check of CONTRAST_CHECKS) {
      if (contrastRatio(working[check.fg], working[check.bg]) >= check.required) continue;
      // Labels sit on a brand color that may itself have just moved; black or
      // white always clears 4.5 on any fill, so pick rather than nudge.
      const fixed = check.fg.endsWith('Fg')
        ? selectForegroundHex(working[check.bg])
        : nudgeToContrast(working[check.fg], working[check.bg], check.required);
      if (!fixed) continue;
      working[check.fg] = fixed;
      updates[check.fg] = fixed;
    }
  }
  return updates;
}
