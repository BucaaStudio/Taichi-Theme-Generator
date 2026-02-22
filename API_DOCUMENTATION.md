# Taichi Theme Generator API Documentation

## Overview

The Taichi Theme Generator API provides endpoints for generating, managing, and
exporting balanced dual-theme color palettes. It uses color harmony theory to
ensure aesthetic consistency across both light and dark modes.

**Base URL:** `https://taichi.bucaastudio.com/api`

## Rate Limits

All endpoints are rate-limited per IP address to ensure stability on Vercel's
free tier:

- **Generate Theme:** 10 requests/minute
- **Theme History:** 20 requests/minute
- **Export Theme:** 15 requests/minute

When rate limited, you'll receive a `429` status code with a `retryAfter` field
indicating seconds until reset.

## Authentication

Currently, no authentication is required. All endpoints are publicly accessible.

---

## Endpoints

### 1. Generate Theme

Generate a pair of balanced Light and Dark themes based on color harmony rules.

**Endpoint:** `POST /api/generate-theme`

**Rate Limit:** 10 requests/minute

#### Request Body

```json
{
    "mode": "random", // Optional: harmony mode (alias: style)
    "baseColor": "#3B82F6", // Optional: hex color seed (alias: seed)
    "saturationLevel": 0, // Optional: -5 to 5 (aliases: saturation, sat)
    "contrastLevel": 0, // Optional: -5 to 5 (aliases: contrast, con)
    "brightnessLevel": 0, // Optional: -5 to 5 (aliases: brightness, bri)
    "darkFirst": false, // Optional: use dark-first generation
    "splitAdjustments": false, // Optional: separate light/dark adjustments
    "lightSaturationLevel": 0, // Optional when splitAdjustments=true
    "lightContrastLevel": 0,
    "lightBrightnessLevel": 0,
    "darkSaturationLevel": 0,
    "darkContrastLevel": 0,
    "darkBrightnessLevel": 0
}
```

#### Parameters

| Parameter              | Type    | Default  | Range    | Description                                                         |
| ---------------------- | ------- | -------- | -------- | ------------------------------------------------------------------- |
| `mode` (`style`)       | string  | `random` | See list | Color harmony mode (e.g., `analogous`, `triadic`).                 |
| `baseColor` (`seed`)   | string  | random   | Hex      | Influence the primary hue of the palette.                          |
| `saturationLevel`      | number  | `0`      | -5 to 5  | Shared saturation adjustment (aliases: `saturation`, `sat`).       |
| `contrastLevel`        | number  | `0`      | -5 to 5  | Shared contrast adjustment (aliases: `contrast`, `con`).           |
| `brightnessLevel`      | number  | `0`      | -5 to 5  | Shared brightness adjustment (aliases: `brightness`, `bri`).       |
| `darkFirst`            | boolean | `false`  | -        | Generate dark mode as the source palette, then derive light mode.  |
| `splitAdjustments`     | boolean | `false`  | -        | Enable separate light/dark adjustment values.                      |
| `light*` / `dark*`     | number  | shared   | -5 to 5  | Per-mode levels used only when `splitAdjustments` is `true`.       |

#### Response

Returns both `light` and `dark` theme variants.

```json
{
    "success": true,
    "light": {
        "bg": "#F8FAFC",
        "card": "#F1F5F9",
        "card2": "#E2E8F0",
        "text": "#0F172A",
        "textMuted": "#475569",
        "textOnColor": "#FFFFFF",
        "primary": "#3B82F6",
        "primaryFg": "#FFFFFF",
        "secondary": "#6366F1",
        "secondaryFg": "#FFFFFF",
        "accent": "#F43F5E",
        "accentFg": "#FFFFFF",
        "border": "#CBD5E1",
        "ring": "#3B82F6",
        "good": "#10B981",
        "goodFg": "#FFFFFF",
        "warn": "#F59E0B",
        "warnFg": "#000000",
        "bad": "#EF4444",
        "badFg": "#FFFFFF"
    },
    "dark": {
        "bg": "#0F172A",
        "card": "#1E293B",
        "card2": "#334155",
        "text": "#F8FAFC",
        "textMuted": "#94A3B8",
        "textOnColor": "#FFFFFF",
        "primary": "#60A5FA",
        "primaryFg": "#000000",
        "secondary": "#818CF8",
        "secondaryFg": "#000000",
        "accent": "#FB7185",
        "accentFg": "#000000",
        "border": "#334155",
        "ring": "#60A5FA",
        "good": "#34D399",
        "goodFg": "#000000",
        "warn": "#FBBF24",
        "warnFg": "#000000",
        "bad": "#F87171",
        "badFg": "#000000"
    },
    "metadata": {
        "mode": "analogous",
        "style": "analogous",
        "seed": "#3B82F6",
        "timestamp": 1703376000000,
        "philosophy": "Harmony found in nature by choosing neighboring colors on the wheel.",
        "options": {
            "darkFirst": false,
            "splitAdjustments": false,
            "saturationLevel": 0,
            "contrastLevel": 0,
            "brightnessLevel": 0
        }
    }
}
```

#### Style Options (`style`)

- **random:** Pick a random harmony mode.
- **monochrome:** Variations of a single hue.
- **analogous:** Colors adjacent on the hue wheel.
- **complementary:** Opposing colors for high contrast.
- **split-complementary:** Two colors adjacent to the complement.
- **triadic:** Three equally spaced hues.
- **tetradic:** Double-complementary (four colors).
- **compound:** A mix of complementary and analogous values.
- **triadic-split:** Complex harmony for broad design systems.

---

### 2. Export Theme

Convert a theme object into developer-ready code formats.

**Endpoint:** `POST /api/export-theme`

**Rate Limit:** 15 requests/minute

#### Request Body

```json
{
    "theme": { "bg": "#F8FAFC", "primary": "#3B82F6", ... },
    "format": "css", // css, scss, less, tailwind, json
    "options": {
        "prefix": "taichi",
        "includeComments": true
    }
}
```

#### Response

```json
{
    "success": true,
    "format": "css",
    "content": ":root {\n  --taichi-bg: #F8FAFC;\n  --taichi-primary: #3B82F6;\n  ...\n}",
    "filename": "taichi-theme.css"
}
```

---

## Error Codes

| Code                  | Description                                      |
| --------------------- | ------------------------------------------------ |
| `METHOD_NOT_ALLOWED`  | Wrong HTTP method used (use POST for generation) |
| `RATE_LIMIT_EXCEEDED` | Too many requests, check `retryAfter`            |
| `INVALID_STYLE`       | Style name not recognized                        |
| `INVALID_PARAMETERS`  | Saturation/Contrast/Brightness out of range      |
| `INVALID_BASE_COLOR`  | Invalid hex color format                         |
| `INVALID_THEME`       | Invalid theme object structure for export        |
| `INVALID_FORMAT`      | Export format not supported                      |
| `INTERNAL_ERROR`      | Server error occurred during processing          |

---

## Integration Best Practices

1. **Dual-Theme Awareness:** Always use the `light` and `dark` variants together
   to ensure your UI remains balanced when users switch modes.
2. **Handle 429s:** Implement exponential backoff for the 10 req/min limit.
3. **Use OKLCH for CSS:** When possible, export in JSON and use `oklch()` in
   your CSS for best results on modern displays (P3 wide gamut).

For support, please open an issue on
[GitHub](https://github.com/BucaaStudio/Taichi-Theme-Generator).
