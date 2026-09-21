import { describe, expect, it } from '@jest/globals';
import { generateTheme } from '../utils/colorUtils';
import { auditContrast, fixContrast } from '../utils/contrastReport';
import { toOklch } from '../utils/oklch';

describe('Contrast report', () => {
  it('flags unreadable pairs and leaves passing ones alone', () => {
    const { light } = generateTheme('analogous', '#2563eb', 0, 0, 0);
    const washed = { ...light, textMuted: '#d9dde3', primary: '#cfe0ff' };
    const failing = auditContrast(washed).filter((result) => !result.pass).map((result) => result.fg);
    expect(failing).toContain('textMuted');
    expect(failing).toContain('primary');
    expect(failing).not.toContain('text');
  });

  it('fixes every failure while keeping hue and surfaces', () => {
    for (const side of ['light', 'dark'] as const) {
      const theme = generateTheme('triadic', '#c8102e', 0, 0, 0)[side];
      const broken = { ...theme, textMuted: theme.card, primary: theme.bg === theme.card ? theme.card2 : theme.card, warn: theme.card };
      const brokenWithHue = { ...broken, primary: side === 'light' ? '#ffd9de' : '#3a0a12' };
      const updates = fixContrast(brokenWithHue);
      const fixed = { ...brokenWithHue, ...updates };
      expect(auditContrast(fixed).filter((result) => !result.pass)).toEqual([]);
      expect(updates.bg).toBeUndefined();
      expect(updates.card).toBeUndefined();
      const hueShift = Math.abs(toOklch(fixed.primary).H - toOklch(brokenWithHue.primary).H);
      expect(Math.min(hueShift, 360 - hueShift)).toBeLessThan(6);
    }
  });

  it('returns no changes for a theme that already passes', () => {
    const { light } = generateTheme('analogous', '#2563eb', 0, 0, 0);
    const clean = { ...light, ...fixContrast(light) };
    expect(fixContrast(clean)).toEqual({});
  });
});
