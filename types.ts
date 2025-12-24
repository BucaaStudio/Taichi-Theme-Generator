
export interface ColorToken {
  hex: string;
  name: string; // e.g., "Primary", "Background"
}

export interface ThemeTokens {
  bg: string;
  card: string;
  card2: string;
  text: string;
  textMuted: string;
  textOnColor: string;  // Text color for use on colored backgrounds (primary, secondary, etc.)
  primary: string;
  primaryFg: string;
  secondary: string;
  secondaryFg: string;
  accent: string;
  accentFg: string;
  border: string;
  ring: string;
  good: string;
  goodFg: string;
  warn: string;
  warnFg: string;
  bad: string;
  badFg: string;
}

export interface DualTheme {
  id: string;
  timestamp: number;
  light: ThemeTokens;
  dark: ThemeTokens;
  seed: string; // The base hue or hex used to generate
  mode: GenerationMode;
}

export type GenerationMode = 'random' | 'monochrome' | 'analogous' | 'complementary' | 'split-complementary' | 'triadic' | 'tetradic' | 'compound' | 'triadic-split' | 'image';

export type ColorFormat = 'hex' | 'rgb' | 'cmyk' | 'hsl' | 'lab' | 'lch' | 'oklch' | 'display-p3';

export interface DesignOptions {
  borderWidth: number;   // 0 - 5
  shadowStrength: number; // 0 - 5 (Size)
  shadowOpacity: number; // 0 - 100 (%)
  gradientLevel: number; // 0 - 5
  radius: number;        // 0 - 5
  brightnessLevel: number; // -5 to 5, 0 is normal
  contrastLevel: number; // -5 to 5, 0 is normal
  saturationLevel: number; // -5 to 5, 0 is normal
}

export type LockedColors = Partial<Record<keyof ThemeTokens, boolean>>;
