# API Quick Reference

## Endpoints

### 1. Generate Theme

```
POST /api/generate-theme
```

**Request:**

```json
{
    "mode": "random",
    "baseColor": "#3B82F6",
    "saturationLevel": 0,
    "contrastLevel": 0,
    "brightnessLevel": 0,
    "darkFirst": false,
    "splitAdjustments": false,
    "lightSaturationLevel": 0,
    "lightContrastLevel": 0,
    "lightBrightnessLevel": 0,
    "darkSaturationLevel": 0,
    "darkContrastLevel": 0,
    "darkBrightnessLevel": 0
}
```

**Response:**

```json
{
    "success": true,
    "light": {/* 20 tokens */},
    "dark": {/* 20 tokens */},
    "metadata": {
        "mode": "analogous",
        "style": "analogous",
        "seed": "#3B82F6",
        "timestamp": 1703376000000,
        "philosophy": "...",
        "options": {
            "darkFirst": false,
            "splitAdjustments": false,
            "saturationLevel": 0,
            "contrastLevel": 0,
            "brightnessLevel": 0,
            "lightSaturationLevel": 0,
            "lightContrastLevel": 0,
            "lightBrightnessLevel": 0,
            "darkSaturationLevel": 0,
            "darkContrastLevel": 0,
            "darkBrightnessLevel": 0
        }
    }
}
```

`light` and `dark` each contain 20 semantic tokens (40 total token values per response).

**Adjustment aliases:**

- Shared: `saturationLevel|saturation|sat`, `contrastLevel|contrast|con`, `brightnessLevel|brightness|bri`
- Split short aliases: `lsat`, `lcon`, `lbri`, `dsat`, `dcon`, `dbri`

**Rate Limit:** 10 requests/minute

---

### 2. Export Theme

```
POST /api/export-theme
```

**Request:**

```json
{
    "theme": {/* theme object */},
    "format": "css",
    "options": {
        "prefix": "taichi",
        "includeComments": true
    }
}
```

**Response:**

```json
{
    "success": true,
    "format": "css",
    "content": ":root { ... }",
    "filename": "taichi-theme.css"
}
```

**Rate Limit:** 15 requests/minute

---

## Harmony Modes (`mode` or `style`)

- `monochrome`
- `analogous`
- `complementary`
- `split-complementary`
- `triadic`
- `tetradic`
- `compound`
- `triadic-split`
- `random`

---

## Export Formats

- `css` - CSS custom properties
- `scss` - SCSS variables
- `less` - LESS variables
- `tailwind` - Tailwind config
- `json` - Raw JSON

---

## Error Codes

- `METHOD_NOT_ALLOWED`: Use POST
- `RATE_LIMIT_EXCEEDED`: Wait for `retryAfter`
- `INVALID_STYLE`: Check harmony mode
- `INVALID_PARAMETERS`: Saturation/Contrast/Brightness out of range (-5 to 5)
- `INVALID_BASE_COLOR`: Invalid hex
- `INVALID_THEME`: Broken object structure
- `INVALID_FORMAT`: Format not supported
- `INTERNAL_ERROR`: Server error

---

## Quick Start

```javascript
// Generate balanced themes
const response = await fetch("/api/generate-theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        mode: "analogous",
        saturationLevel: 2,
        darkFirst: true,
    }),
});
const { light, dark } = await response.json();

// Export light theme as CSS
const exportResponse = await fetch("/api/export-theme", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        theme: light,
        format: "css",
    }),
});
const { content } = await exportResponse.json();
console.log(content);
```

---

For complete documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
