import { ThemeTokens, GenerationMode } from '../types';

/**
 * API Client for Taichi Theme Generator
 * 
 * This file provides helper functions to interact with the API endpoints.
 * Use these functions in your React components to generate and export themes.
 */

// Configuration
const API_BASE_URL = typeof window !== 'undefined' && window.location.origin.includes('localhost')
  ? '/api'
  : (import.meta.env.VITE_API_URL || '/api');

export type Theme = ThemeTokens;

export interface ThemeMetadata {
  mode?: string;
  style: string;
  seed: string;
  timestamp: number;
  colorSpace?: string;
  philosophy: string;
  options?: {
    darkFirst?: boolean;
    splitAdjustments?: boolean;
    saturationLevel?: number;
    contrastLevel?: number;
    brightnessLevel?: number;
    lightSaturationLevel?: number;
    lightContrastLevel?: number;
    lightBrightnessLevel?: number;
    darkSaturationLevel?: number;
    darkContrastLevel?: number;
    darkBrightnessLevel?: number;
  };
}

export interface GenerateThemeResponse {
  success: boolean;
  light?: Theme;
  dark?: Theme;
  metadata?: ThemeMetadata;
  error?: string;
  code?: string;
  retryAfter?: number;
}

export interface ExportThemeResponse {
  success: boolean;
  format?: string;
  content?: string;
  filename?: string;
  error?: string;
  code?: string;
  retryAfter?: number;
}

export type ThemeStyle = GenerationMode;
export type ExportFormat = 'css' | 'scss' | 'less' | 'tailwind' | 'json';

export interface GenerateThemeOptions {
  mode?: ThemeStyle;
  style?: ThemeStyle;
  baseColor?: string;
  seed?: string;
  saturationLevel?: number;  // -5 to 5
  contrastLevel?: number;    // -5 to 5
  brightnessLevel?: number;  // -5 to 5
  saturation?: number;       // Legacy alias
  contrast?: number;         // Legacy alias
  brightness?: number;       // Legacy alias
  darkFirst?: boolean;
  splitAdjustments?: boolean;
  lightSaturationLevel?: number;
  lightContrastLevel?: number;
  lightBrightnessLevel?: number;
  darkSaturationLevel?: number;
  darkContrastLevel?: number;
  darkBrightnessLevel?: number;
}

/**
 * Generate a new theme using the API
 * 
 * @param options - Theme generation options
 * @returns Promise with light and dark themes or error
 * 
 * @example
 * const result = await generateTheme({ mode: 'analogous', baseColor: '#3B82F6' });
 * if (result.success) {
 *   console.log('Light theme:', result.light);
 *   console.log('Dark theme:', result.dark);
 * }
 */
export async function generateTheme(
  options: GenerateThemeOptions = {}
): Promise<GenerateThemeResponse> {
  const {
    mode,
    style,
    baseColor,
    seed,
    saturationLevel,
    contrastLevel,
    brightnessLevel,
    saturation,
    contrast,
    brightness,
    darkFirst = false,
    splitAdjustments = false,
    lightSaturationLevel,
    lightContrastLevel,
    lightBrightnessLevel,
    darkSaturationLevel,
    darkContrastLevel,
    darkBrightnessLevel
  } = options;

  const resolvedMode = mode ?? style ?? 'random';
  const resolvedSeed = baseColor ?? seed;
  const resolvedSaturation = saturationLevel ?? saturation ?? 0;
  const resolvedContrast = contrastLevel ?? contrast ?? 0;
  const resolvedBrightness = brightnessLevel ?? brightness ?? 0;

  try {
    const payload = {
      mode: resolvedMode,
      baseColor: resolvedSeed,
      saturationLevel: resolvedSaturation,
      contrastLevel: resolvedContrast,
      brightnessLevel: resolvedBrightness,
      darkFirst,
      splitAdjustments,
      lightSaturationLevel: lightSaturationLevel ?? resolvedSaturation,
      lightContrastLevel: lightContrastLevel ?? resolvedContrast,
      lightBrightnessLevel: lightBrightnessLevel ?? resolvedBrightness,
      darkSaturationLevel: darkSaturationLevel ?? resolvedSaturation,
      darkContrastLevel: darkContrastLevel ?? resolvedContrast,
      darkBrightnessLevel: darkBrightnessLevel ?? resolvedBrightness
    };

    const response = await fetch(`${API_BASE_URL}/generate-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to generate theme',
        code: data.code,
        retryAfter: data.retryAfter
      };
    }

    return data;
  } catch (error) {
    console.error('Error generating theme:', error);
    return {
      success: false,
      error: 'Network error while generating theme',
      code: 'NETWORK_ERROR'
    };
  }
}

/**
 * Export a theme in the specified format
 * 
 * @param theme - Theme object to export
 * @param format - Export format (css, scss, less, tailwind, json)
 * @param options - Optional export options
 * @returns Promise with exported content or error
 */
export async function exportTheme(
  theme: Theme,
  format: ExportFormat = 'css',
  options?: {
    prefix?: string;
    includeComments?: boolean;
  }
): Promise<ExportThemeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/export-theme`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme,
        format,
        options
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to export theme',
        code: data.code,
        retryAfter: data.retryAfter
      };
    }

    return data;
  } catch (error) {
    console.error('Error exporting theme:', error);
    return {
      success: false,
      error: 'Network error while exporting theme',
      code: 'NETWORK_ERROR'
    };
  }
}

/**
 * Download exported theme as a file
 * 
 * @param content - File content
 * @param filename - Filename for download
 * @param mimeType - MIME type for the file
 */
export function downloadThemeFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Handle rate limit errors with user-friendly messages
 * 
 * @param retryAfter - Seconds until rate limit resets
 * @returns User-friendly error message
 */
export function getRateLimitMessage(retryAfter?: number): string {
  if (!retryAfter) {
    return 'Rate limit exceeded. Please try again later.';
  }

  if (retryAfter < 60) {
    return `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;
  }

  const minutes = Math.ceil(retryAfter / 60);
  return `Rate limit exceeded. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
}

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * import { generateTheme, exportTheme, downloadThemeFile } from './utils/api-client';
 * 
 * function ThemeGenerator() {
 *   const handleGenerate = async () => {
 *     const result = await generateTheme({
 *       mode: 'analogous',
 *       baseColor: '#3B82F6',
 *       saturationLevel: 2
 *     });
 *     
 *     if (result.success && result.light && result.dark) {
 *       console.log('Light theme:', result.light);
 *       console.log('Dark theme:', result.dark);
 *       console.log('Philosophy:', result.metadata?.philosophy);
 *     } else {
 *       console.error('Error:', result.error);
 *     }
 *   };
 * 
 *   const handleExport = async (theme: Theme) => {
 *     const result = await exportTheme(theme, 'css', {
 *       prefix: 'my-app',
 *       includeComments: true
 *     });
 *     
 *     if (result.success && result.content && result.filename) {
 *       downloadThemeFile(result.content, result.filename, 'text/css');
 *     } else {
 *       console.error('Error:', result.error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleGenerate}>Generate Theme</button>
 *     </div>
 *   );
 * }
 * ```
 */
