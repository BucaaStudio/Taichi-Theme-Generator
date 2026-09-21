import { z } from 'zod';
import { contrastRatio, selectForegroundHex } from './contrast.js';
import type { ThemeTokens } from '../types.js';

export const MAX_THEME_PROMPT_LENGTH = 400;

export const THEME_PROMPT_EXAMPLES = [
  'a bright colorful theme that feels like spring',
  'midnight neon dashboard',
  'usa flag colors',
] as const;

// Tokens the model sets directly. On-color foregrounds and the focus ring are
// derived from these so button labels always stay legible.
export const AI_TOKEN_KEYS = [
  'bg',
  'card',
  'card2',
  'border',
  'text',
  'textMuted',
  'primary',
  'secondary',
  'accent',
  'good',
  'warn',
  'bad',
] as const;

export type AiTokenKey = (typeof AI_TOKEN_KEYS)[number];
export type AiTokens = Record<AiTokenKey, string>;

const aiTokensSchema = z.object({
  bg: z.string(),
  card: z.string(),
  card2: z.string(),
  border: z.string(),
  text: z.string(),
  textMuted: z.string(),
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  good: z.string(),
  warn: z.string(),
  bad: z.string(),
});

const aiOptionsSchema = z.object({
  borderWidth: z.number(),
  shadowStrength: z.number(),
  shadowOpacity: z.number(),
  radius: z.number(),
  gradients: z.boolean(),
  darkFirst: z.boolean(),
  saturation: z.number(),
  contrast: z.number(),
  brightness: z.number(),
});

export type AiOptions = z.infer<typeof aiOptionsSchema>;

export const themePromptIntentSchema = z.object({
  light: aiTokensSchema,
  dark: aiTokensSchema,
  options: aiOptionsSchema,
  rationale: z.string().min(1).max(140),
});

export interface ThemePromptIntent {
  light: AiTokens;
  dark: AiTokens;
  options: AiOptions;
  rationale: string;
}

export interface AiLevels {
  saturation: number;
  contrast: number;
  brightness: number;
}

export interface AiThemeBase {
  light: ThemeTokens;
  dark: ThemeTokens;
  // Slider positions the model says its tokens already represent. Sliders
  // adjust relative to these, so the theme is untouched until the user moves one.
  levels?: AiLevels;
}

export const AI_PHILOSOPHY = 'Every token chosen by AI from your description, then fine-tuned with the sliders.';

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

export function normalizeThemePrompt(value: unknown): { prompt: string } | { error: string; code: string } {
  if (typeof value !== 'string') {
    return { error: 'Prompt is required.', code: 'INVALID_PROMPT' };
  }
  const prompt = value.trim().replace(/\s+/g, ' ');
  if (!prompt) {
    return { error: 'Describe the theme you want.', code: 'INVALID_PROMPT' };
  }
  if (prompt.length > MAX_THEME_PROMPT_LENGTH) {
    return {
      error: `Keep the prompt under ${MAX_THEME_PROMPT_LENGTH} characters.`,
      code: 'PROMPT_TOO_LONG',
    };
  }
  return { prompt };
}

export interface ThemePromptImage {
  data: string; // base64, no data: prefix
  mediaType: string;
}

// ~1.5 MB of image bytes. The app downsizes before upload, so anything larger
// is a client that skipped that step.
export const MAX_THEME_IMAGE_BASE64_LENGTH = 2_000_000;

const IMAGE_DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+=*)$/;

export function normalizeThemeImage(
  value: unknown
): { image: ThemePromptImage | null } | { error: string; code: string } {
  if (value === undefined || value === null || value === '') return { image: null };
  if (typeof value !== 'string') {
    return { error: 'Image must be a base64 data URL.', code: 'INVALID_IMAGE' };
  }
  if (value.length > MAX_THEME_IMAGE_BASE64_LENGTH) {
    return { error: 'Image is too large. Use one under 1.5 MB.', code: 'IMAGE_TOO_LARGE' };
  }
  const match = IMAGE_DATA_URL_RE.exec(value);
  if (!match) {
    return { error: 'Image must be a JPEG, PNG, WebP or GIF data URL.', code: 'INVALID_IMAGE' };
  }
  return { image: { mediaType: match[1], data: match[2] } };
}

// A request needs a description, an image, or both.
export function normalizeThemeRequest(
  body: { prompt?: unknown; image?: unknown }
): { prompt: string; image: ThemePromptImage | null } | { error: string; code: string } {
  const parsedImage = normalizeThemeImage(body.image);
  if ('error' in parsedImage) return parsedImage;
  const hasPrompt = typeof body.prompt === 'string' && body.prompt.trim() !== '';
  if (!hasPrompt && parsedImage.image) return { prompt: '', image: parsedImage.image };
  const parsedPrompt = normalizeThemePrompt(body.prompt);
  if ('error' in parsedPrompt) return parsedPrompt;
  return { prompt: parsedPrompt.prompt, image: parsedImage.image };
}

export function normalizeSeedHex(value: string): string | null {
  const trimmed = value.trim();
  const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (!HEX_RE.test(hex)) return null;
  return hex.toLowerCase();
}

function normalizeAiTokens(raw: AiTokens): AiTokens {
  const next = {} as AiTokens;
  for (const key of AI_TOKEN_KEYS) {
    const hex = normalizeSeedHex(raw[key]);
    if (!hex) throw new Error(`Model returned an invalid color for ${key}.`);
    next[key] = hex;
  }
  return next;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clampThemePromptIntent(raw: unknown): ThemePromptIntent {
  const parsed = themePromptIntentSchema.parse(raw);
  return {
    light: normalizeAiTokens(parsed.light),
    dark: normalizeAiTokens(parsed.dark),
    options: {
      borderWidth: clampInt(parsed.options.borderWidth, 0, 2),
      shadowStrength: clampInt(parsed.options.shadowStrength, 0, 5),
      shadowOpacity: clampInt(parsed.options.shadowOpacity, 0, 100),
      radius: clampInt(parsed.options.radius, 0, 5),
      gradients: parsed.options.gradients,
      darkFirst: parsed.options.darkFirst,
      saturation: clampInt(parsed.options.saturation, -5, 5),
      contrast: clampInt(parsed.options.contrast, -5, 5),
      brightness: clampInt(parsed.options.brightness, -5, 5),
    },
    rationale: parsed.rationale.trim().slice(0, 140),
  };
}

// The model has full say over color. The only correction is body text that
// would be unreadable on its own background.
function completeTokens(ai: AiTokens): ThemeTokens {
  const readable = (fg: string, floor: number) =>
    contrastRatio(fg, ai.bg) >= floor ? fg : selectForegroundHex(ai.bg);
  const primaryFg = selectForegroundHex(ai.primary);
  return {
    ...ai,
    text: readable(ai.text, 4.5),
    textMuted: readable(ai.textMuted, 3),
    textOnColor: primaryFg,
    primaryFg,
    secondaryFg: selectForegroundHex(ai.secondary),
    accentFg: selectForegroundHex(ai.accent),
    goodFg: selectForegroundHex(ai.good),
    warnFg: selectForegroundHex(ai.warn),
    badFg: selectForegroundHex(ai.bad),
    ring: ai.primary,
  };
}

export function buildThemeFromIntent(intent: ThemePromptIntent) {
  return {
    light: completeTokens(intent.light),
    dark: completeTokens(intent.dark),
    levels: {
      saturation: intent.options.saturation,
      contrast: intent.options.contrast,
      brightness: intent.options.brightness,
    },
    seed: intent.light.primary,
    mode: 'ai' as const,
  };
}

// Compact share-URL form: the 12 model tokens for light then dark, no '#',
// then '.sat.con.bri' when the model set slider levels.
export function encodeAiBase(base: AiThemeBase): string {
  const hex = (['light', 'dark'] as const)
    .flatMap((side) => AI_TOKEN_KEYS.map((key) => base[side][key].replace('#', '')))
    .join('');
  const { levels } = base;
  return levels ? `${hex}.${levels.saturation}.${levels.contrast}.${levels.brightness}` : hex;
}

export function decodeAiBase(encoded: string | null): AiThemeBase | null {
  const count = AI_TOKEN_KEYS.length;
  const [value, ...rawLevels] = (encoded ?? '').split('.');
  if (!new RegExp(`^[0-9A-Fa-f]{${count * 12}}$`).test(value)) return null;
  const [saturation, contrast, brightness] = rawLevels.map((raw) => clampInt(Number(raw) || 0, -5, 5));
  const side = (offset: number) => {
    const tokens = {} as AiTokens;
    AI_TOKEN_KEYS.forEach((key, index) => {
      const start = (offset + index) * 6;
      tokens[key] = `#${value.slice(start, start + 6).toLowerCase()}`;
    });
    return completeTokens(tokens);
  };
  return {
    light: side(0),
    dark: side(count),
    ...(rawLevels.length === 3 ? { levels: { saturation, contrast, brightness } } : {}),
  };
}

export class PromptThemeError extends Error {
  status: number;
  code: string;

  constructor(message: string, code: string, status = 500) {
    super(message);
    this.name = 'PromptThemeError';
    this.code = code;
    this.status = status;
  }
}
