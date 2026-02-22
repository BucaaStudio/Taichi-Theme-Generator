# Taichi Theme Generator

<div align="center">
  <img src="public/favicon.svg" width="120" height="120" alt="Taichi Logo" />

**A powerful dual-theme color palette generator with real-time preview**

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://taichi.bucaastudio.com)
[![Vercel](https://img.shields.io/badge/deployed-vercel-black)](https://vercel.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

<a href="https://www.producthunt.com/products/taichi-light-dark-theme-generator?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-taichi-light-dark-theme-generator" target="_blank" rel="noopener noreferrer"><img alt="Taichi - Light &amp; Dark Theme Generator - Generate perfectly matched Light &amp; Dark UI themes | Product Hunt" width="160" height="35" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1055269&amp;theme=light&amp;t=1766935885717"></a>

</div>

<div align="center">
  <img src="public/readme-screenshot.png" alt="Taichi Theme Generator Preview" width="100%" />
</div>

## Features

- **Dual Theme Generation** - Simultaneously generate perfectly matched light
  and dark themes
- **Multiple Color Harmonies** - Random, Monochrome, Analogous, Complementary,
  Split-Complementary, Triadic, Tetradic, Compound, and Triadic-Split
- **Advanced Controls**
  - Saturation, contrast, brightness: `-5` to `+5`
  - Optional split light/dark adjustments (`light*` and `dark*` levels)
  - Dark-first generation toggle for mode-first workflows
  - Border width, shadow strength, roundness, and gradient controls
- **Smart Color Formats** - Export in HEX, RGB, CMYK, HSL, LAB, LCH, OKLCH, or
  Display P3
- **Image Color Extraction** - Extract 10 colors from an image mapped to all
  palette roles (bg, card, text, textMuted, textOnColor, primary, secondary,
  accent, good, bad) with dark-mode-aware sorting
- **History Management** - FIFO history with up to 20 saved themes
- **Keyboard Shortcuts**
  - `Space` - Generate new theme
  - `Cmd/Ctrl + Z` - Undo
- **Live Preview** - See your theme applied to real UI components instantly
- **Export & Import** - Save themes as JSON files with your preferred color
  format
- **API Endpoints** - Programmatic access to theme generation and export
  - Generate themes via REST API
  - Export themes in multiple formats (CSS, SCSS, Tailwind, etc.)
  - Rate-limited for Vercel free tier
  - LLM-friendly with comprehensive documentation

## Live Demo

Visit [taichi.bucaastudio.com](https://taichi.bucaastudio.com) to try it out!

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BucaaStudio/Taichi-Theme-Generator.git
   cd Taichi-Theme-Generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

## Build for Production

```bash
npm run build
npm run preview
```

## Usage

### Generating Themes

1. **Select a color harmony mode** from the dropdown (Random, Monochrome, etc.)
2. **Adjust design options** using the sliders:
   - **Saturation**: -5 (muted) to +5 (vivid)
   - **Contrast**: -5 (flatter) to +5 (stronger separation)
   - **Brightness**: -5 (darker) to +5 (lighter)
   - **Roundness**: 0 (square) to 5 (fully rounded)
   - **Shadows**: 0 (flat) to 5 (floating)
   - **Gradients**: 0 (solid) to 2 (vivid)
3. **Press Space** or click "Generate" to create a new theme, or use **Pick from
   Image** to replace the palette with extracted colors
4. **View the preview** - See your theme applied to both light and dark modes
   side-by-side

### Image Palette Import

1. Open **Pick from Image** and upload/paste a screenshot or photo
2. The extractor produces **10 colors** in a 5x2 grid matching the palette
   structure: BG, Card, Text, TextMuted, TextOnColor, Primary, Secondary,
   Accent, Good, Bad
3. Click any slot to select it, then click the image to pick a specific color
4. Toggle checkboxes to choose which slots to import (unchecked slots
   regenerate)
5. Click **Import Selection** to apply

### Color Palette Strip

- Click any color swatch to **copy** the color value
- Click the color name to **edit** the color manually
- Switch between **HEX, RGB, CMYK, HSL, LAB, LCH, OKLCH, and Display P3**
  formats
- View 10 key colors: bg, card, text, textMuted, textOnColor, primary,
  secondary, accent, good, bad

### Exporting Themes

1. Click the **Download** button in the toolbar
2. Your theme will be exported as JSON with colors in your selected format
3. The file includes both light and dark variants plus metadata

### History

- **New themes appear on the left** (FIFO order)
- **Maximum 20 themes** stored
- Click any history item to restore that theme
- History is **persisted** in localStorage

## Color System

**v26.2.1 - OKLCH Palette Intelligence Engine**

The generator now uses a perceptually-uniform OKLCH color space for all color
computation, ensuring consistent and aesthetically pleasing palettes.

### Core Principles

- **OKLCH-First**: All color math happens in OKLCH for perceptual accuracy
- **Single Adjustment Stage**: Brightness, contrast, and saturation are applied
  together through one coherent post-generation transform
- **Companion Parity**: Light and dark chromatic tokens are parity-aligned to
  preserve hue/chroma identity across modes
- **Readability Guardrails**: Text and muted text are corrected against core
  surfaces (`bg`, `card`, `card2`) after adjustments
- **Scored & Validated**: Every palette is evaluated for contrast, harmony, and
  usability
- **Reproducible**: Seeded generation ensures identical palettes from the same
  seed

### Design Tokens

- **Backgrounds**: `bg`, `card`, `card2`
- **Text**: `text`, `textMuted`, `textOnColor`
- **Brand**: `primary`, `secondary`, `accent`
- **Semantic**: `good`, `warn`, `bad`
- **UI**: `border`, `ring`
- **Foregrounds**: `primaryFg`, `secondaryFg`, `accentFg`, `goodFg`, `badFg`,
  `warnFg`

### Quality Guarantees

| Rule                | Guaranteed                                                            |
| ------------------- | --------------------------------------------------------------------- |
| Text Readability    | Guardrailed on core surfaces (`text`: 3.8+ light / 5.0+ dark)        |
| Muted Readability   | Guardrailed on core surfaces (`textMuted`: 2.6+ light / 3.4+ dark)    |
| Dark/Light Identity | Companion parity keeps semantic hue/chroma aligned across modes       |
| Visual Stability    | Token separation and deduplication keep surfaces/borders/text distinct |
| Reproducibility     | Seeded RNG + deterministic transforms                                 |

## API Documentation

The Taichi Theme Generator provides REST API endpoints for programmatic theme
generation and export.

### Quick Start

```javascript
// Generate an analogous theme
const response = await fetch("/api/generate-theme", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    style: "analogous",
    baseColor: "#3B82F6",
    saturationLevel: 2,
    contrastLevel: 1,
    brightnessLevel: -1,
  }),
});
const { light, dark, metadata } = await response.json();
// Returns 20 tokens per theme (40 total tokens in each dual-theme response)
```

### Available Endpoints

- **POST /api/generate-theme** - Generate balanced light/dark themes (10
  req/min)
- **POST /api/export-theme** - Export themes in multiple formats (15 req/min)

### Documentation

- 📖 [Complete API Documentation](./API_DOCUMENTATION.md)
- ⚡ [Quick Reference](./API_QUICK_REFERENCE.md)

All endpoints are rate-limited for Vercel's free tier and designed to be
LLM-friendly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

Created by [Bucaa Studio](https://bucaastudio.com)

---

<div align="center">
  Made with care using the Taichi philosophy of balance and harmony
</div>
