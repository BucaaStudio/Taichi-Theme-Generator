# API Directory

This directory contains Vercel serverless functions for the Taichi Theme
Generator.

## Structure

```
api/
├── generate-theme.ts    # OKLCH-based theme generation
├── export-theme.ts      # Multi-format theme exporter
└── README.md            # This file
```

## Key Features

- **OKLCH Color Space:** All color calculations use the perceptually uniform
  OKLCH color space for consistent, balanced themes.
- **Gamut Mapping:** Automatic clamping ensures all colors stay within sRGB
  gamut while preserving perceptual uniformity.
- **Dual Support:** Every generation returns matching Light and Dark themes.
- **Semantic Tokens:** Outputs 20 semantic tokens per theme (40 total values in
  a dual-theme response).
- **Unified Adjustments:** Brightness, contrast, and saturation are applied in
  one coherent adjustment stage (`-5` to `+5` each).
- **Readability Guardrails:** Final pass enforces text legibility and semantic
  token separation.
- **Format Support:** Export to CSS, SCSS, LESS, Tailwind, and JSON.

## Rate Limiting

- **Generate Theme:** 10 requests/minute per IP
- **Export Theme:** 15 requests/minute per IP

## Testing Endpoints Locally

Start the Vercel dev server:

```bash
vercel dev
```

### Example: Generate dual-themes

```bash
curl -X POST http://localhost:3000/api/generate-theme \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "analogous",
    "baseColor": "#3B82F6",
    "saturationLevel": 2,
    "contrastLevel": 2,
    "brightnessLevel": -1,
    "darkFirst": true,
    "splitAdjustments": true,
    "lightSaturationLevel": 1,
    "lightContrastLevel": 1,
    "lightBrightnessLevel": 1,
    "darkSaturationLevel": 0,
    "darkContrastLevel": 2,
    "darkBrightnessLevel": -1
  }'
```

### Example: Export to CSS

```bash
curl -X POST http://localhost:3000/api/export-theme \
  -H "Content-Type: application/json" \
  -d '{
    "theme": { "primary": "#3B82F6", "bg": "#F8FAFC" },
    "format": "css",
    "options": { "prefix": "my-app" }
  }'
```

## Color Science

The API uses **OKLCH** (Oklab Lightness-Chroma-Hue) for color generation:

- **Perceptually Uniform:** Equal steps in OKLCH produce equal perceived
  differences, unlike HSL/HSV.
- **Gamut Mapping:** Binary search algorithm ensures maximum chroma while
  staying within sRGB gamut.
- **Harmony Modes:** Hue offsets applied in OKLCH space for accurate color
  relationships.

This matches the frontend's `utils/paletteEngine.ts` and `utils/oklch.ts`
implementation.

## Documentation

For the full API reference, request/response schemas, and LLM integration guide,
see [API_DOCUMENTATION.md](../API_DOCUMENTATION.md).
