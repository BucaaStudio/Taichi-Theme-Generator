import { describe, expect, it } from '@jest/globals';
import { parseToHex } from '../utils/colorUtils';
import { toOklch } from '../utils/oklch';

describe('parseToHex', () => {
  it('parses hex in short and long forms', () => {
    expect(parseToHex('#abc')).toBe('#aabbcc');
    expect(parseToHex('336699')).toBe('#336699');
  });

  it('parses compact HSL using the active format, not RGB', () => {
    const parsed = parseToHex('200 50 40', 'hsl');
    expect(parsed).toMatch(/^#[0-9a-f]{6}$/);
    expect(parsed).not.toBe('#c83228');
  });

  it('parses hsl() strings', () => {
    const parsed = parseToHex('hsl(200, 50%, 40%)');
    expect(parsed).toBe(parseToHex('200 50 40', 'hsl'));
  });

  it('parses compact OKLCH using the active format', () => {
    const parsed = parseToHex('0.500 0.150 180.0', 'oklch');
    expect(parsed).toMatch(/^#[0-9a-f]{6}$/);
    const color = toOklch(parsed!);
    expect(color.H).toBeGreaterThan(160);
    expect(color.H).toBeLessThan(200);
  });

  it('does not treat HSL triples as RGB when format is hsl', () => {
    expect(parseToHex('200 50 40', 'hsl')).not.toBe(parseToHex('200, 50, 40', 'rgb'));
  });
});
