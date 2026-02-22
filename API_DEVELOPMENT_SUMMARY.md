# API Development Summary

**Last Updated:** February 22, 2026

## Overview

The Taichi Theme Generator API provides programmatic access to balanced color
theme generation. All endpoints are self-contained serverless functions
optimized for Vercel's free tier with robust rate limiting.

## Key Features

### 1. Dual-Theme Response

Every request to `/api/generate-theme` returns both **Light and Dark themes**
simultaneously, ensuring visual parity for modern UI development.

### 2. Advanced Generation Parameters

- **Saturation (-5 to 5):** Control vibrancy from muted to vivid.
- **Contrast (-5 to 5):** Control separation/flatness across tokens.
- **Brightness (-5 to 5):** Global lightness shift.
- **Split Controls:** Optional independent `light*` / `dark*` levels.
- **Dark First:** Optional dark-first generation with companion parity.

### 3. Unified Adjustment Pipeline

- Base palettes are generated at neutral levels.
- Brightness, contrast, and saturation are then applied together in one coherent adjustment stage.
- A parity pass aligns chromatic token identity between light/dark modes.

### 4. Readability Guardrails

- Text readability is enforced on `bg`, `card`, and `card2` after all adjustments.
- Guardrails also ensure token separation (e.g., border vs bg/card, text vs textMuted).

### 5. Harmony Modes

9 color harmony styles supported:

- `monochrome`, `analogous`, `complementary`, `split-complementary`,
- `triadic`, `tetradic`, `compound`, `triadic-split`, `random`

## Available Endpoints

### `/api/generate-theme` (POST)

- Generates balanced Light and Dark themes using color harmony theory.
- Returns 20 semantic tokens per theme (40 total token values per response).
- Includes metadata with philosophical context.

### `/api/export-theme` (POST)

- Converts any theme object into developer formats.
- Supports: **CSS, SCSS, LESS, Tailwind, and JSON**.

## File Structure

```
api/
├── generate-theme.ts   # API handler for theme generation
├── export-theme.ts     # Multi-format exporter
└── README.md           # Local dev guide
```

## Testing

```bash
curl -X POST https://taichi.bucaastudio.com/api/generate-theme \
  -H "Content-Type: application/json" \
  -d '{"style":"analogous","baseColor":"#3B82F6","saturationLevel":2,"contrastLevel":1,"brightnessLevel":-1}'
```

## Future Roadmap

1. **OKLCH Export:** Support `oklch()` CSS values for P3 wide gamut displays.
2. **AI Integration:** Allow LLMs to refine generated themes via API.

---

**Status:** ✅ Live and Functional
