
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
  borderWidth: number;   // 0 - 2 (none, thin, thick)
  shadowStrength: number; // 0 - 5 (Size)
  shadowOpacity: number; // 0 - 100 (%)
  gradients: boolean;    // Apply gradients to colored elements
  radius: number;        // 0 - 5
  brightnessLevel: number; // -5 to 5, 0 is normal (shared when split is off)
  contrastLevel: number; // -5 to 5, 0 is normal (shared when split is off)
  saturationLevel: number; // -5 to 5, 0 is normal (shared when split is off)
  darkFirst: boolean;    // Generate dark mode first, derive light from dark
  splitAdjustments: boolean; // When true, light/dark have independent B/C/S sliders
  lightBrightnessLevel: number; // -5 to 5 (per-mode)
  lightContrastLevel: number;   // -5 to 5 (per-mode)
  lightSaturationLevel: number; // -5 to 5 (per-mode)
  darkBrightnessLevel: number;  // -5 to 5 (per-mode)
  darkContrastLevel: number;    // -5 to 5 (per-mode)
  darkSaturationLevel: number;  // -5 to 5 (per-mode)
}

export type LockedColors = Partial<Record<keyof ThemeTokens, boolean>>;

export type LockedOptions = Partial<Record<keyof DesignOptions, boolean>>;

// --- OKLCH Palette Engine Types (v25.12.2) ---

export interface OklchColor {
  L: number;  // Lightness: 0-1
  C: number;  // Chroma: 0-0.4 (typical range)
  H: number;  // Hue: 0-360
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface PaletteMetadata {
  seed: string;
  baseHue: number;
  mode: GenerationMode;
  score?: number;
  timestamp: number;
}

export interface ExtendedTheme extends DualTheme {
  metadata: PaletteMetadata;
  neutralScale?: ColorScale;
  primaryScale?: ColorScale;
}
