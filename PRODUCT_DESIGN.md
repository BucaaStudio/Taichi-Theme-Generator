# Taichi Theme Generator - Product Design Document

**Version**: 25.12.1\
**Last Updated**: 2024-12-24

---

## Overview

Taichi Theme Generator is a web-based tool for generating harmonious dual
light/dark theme color palettes for design systems. The application generates 10
semantic color tokens that work together to create cohesive UI themes, with
real-time preview of how the colors appear in common UI components.

---

## Core Concepts

### Dual Theme Generation

Every generation produces **both** a Light and Dark theme simultaneously,
ensuring visual harmony across both modes. The themes share the same hue
relationships but apply different lightness values appropriate for each mode.

### Semantic Color Tokens (10 Total)

The generator produces 10 lockable/editable color tokens:

| Token         | Purpose                                       |
| ------------- | --------------------------------------------- |
| `bg`          | Main page/app background                      |
| `card`        | Card, modal, container backgrounds            |
| `text`        | Primary body text                             |
| `textMuted`   | Secondary/muted text (captions, labels)       |
| `textOnColor` | Text on colored backgrounds (buttons, badges) |
| `primary`     | Primary brand/action color                    |
| `secondary`   | Secondary brand color                         |
| `accent`      | Highlight/accent color                        |
| `good`        | Success/positive state                        |
| `bad`         | Error/destructive state                       |

### Additional Internal Tokens (Not Displayed in Swatch Strip)

These tokens are generated but not shown in the main swatch strip:

- `card2` - Secondary surface (derived from `card`)
- `primaryFg` - Foreground on primary (typically white)
- `secondaryFg` - Foreground on secondary
- `accentFg` - Foreground on accent
- `goodFg` - Foreground on success
- `badFg` - Foreground on error
- `warnFg` - Foreground on warn
- `border` - Border color (derived from text)
- `ring` - Focus ring color (derived from primary)
- `warn` / `warnFg` - Warning state (not displayed)

---

## User Interface Layout

The application has a vertical layout structure:

```
┌─────────────────────────────────────────────────────────────┐
│                        HEADER BAR                           │
├─────────────────────────────────────────────────────────────┤
│              OPTIONS PANEL (Collapsible)                    │
├─────────────────────────────────────────────────────────────┤
│               SWATCH STRIP (Collapsible)                    │
├─────────────────────────────────────────────────────────────┤
│   LIGHT THEME PREVIEW    │    DARK THEME PREVIEW            │
│                          │                                  │
│                          │                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Elements - Detailed Description

### 1. Header Bar

**Location**: Fixed at top of viewport\
**Background**: Uses current UI theme (light/dark based on system preference or
user toggle)

#### 1.1 Logo / Brand (Left Side)

- **Taichi Icon**: Custom yin-yang SVG icon representing duality of light/dark
  themes. use `card` color for icon background, use light `bg` color for icon
  white parts, use dark `bg` color for icon black parts.
- **Text**: "Taichi Theme Generator"
- **Interaction**: logo rotates 180 degrees on hover (decorative)

#### 1.2 Navigation Controls (Right Side)

Two navigation arrows for history:

- **Left Arrow** (`←`): Navigate to previous theme in history (older)
- **Right Arrow** (`→`): Navigate to next theme in history (newer)

#### 1.3 Generate Button

- **Icon**: Shuffle + Spacebar badge
- **Label**: "Generate" + "Space" indicator
- **Action**: Generates a new random theme using current mode and settings
- **Keyboard Shortcut**: `Space` key

#### 1.4 Mode Dropdown

Harmony mode selection for color generation:

- **Random**: Random hue selection based on current brightness, contrast, and
  saturation settings
- **Monochrome**: Single hue with saturation variations
- **Analogous**: Adjacent hues (±30°)
- **Complementary**: Opposite hues (180° apart)
- **Split-Complementary**: Base + two colors ±150° apart
- **Triadic**: Three colors 120° apart
- **Tetradic**: Four colors 90° apart
- **Compound**: Two complementary pairs
- **Triadic Split**: Three colors 120° apart with one color shifted ±150°

#### 1.5 Format Dropdown

Output color format for copy/export and on-screen display:

- **HEX**: `#RRGGBB` | RRGGBB (default)
- **RGB (0-255)**: `rgb(R, G, B)` | R, G, B (0-255)
- **RGB (0-1)**: `rgb(R, G, B)` | R, G, B (0-1)
- **CMYK**: `cmyk(C%, M%, Y%, K%)` | C%, M%, Y%, K% (0-100)
- **HSL**: `hsl(H, S%, L%)` | H, S%, L%
- **LAB**: `lab(L% a b)` | L%, a, b
- **OKLCH**: `oklch(L% C H)` | L%, C, H
- **Display P3**: `color(display-p3 R G B)` | R, G, B

#### 1.6 Action Buttons (Icon Buttons)

| Button       | Icon  | Action                             |
| ------------ | ----- | ---------------------------------- |
| Palette      | 🎨    | Toggle Swatch Strip visibility     |
| Options      | ⚙️    | Toggle Options Panel visibility    |
| Image        | 🖼️    | Upload image to extract seed color |
| History      | 📜    | Toggle History Panel visibility    |
| Download     | ⬇️    | Export theme as JSON file          |
| Share        | 🔗    | Open Share Modal for URL sharing   |
| Theme Toggle | ☀️/🌙 | Toggle UI between light/dark mode  |

#### 1.7 Mobile Menu

- **Hamburger Icon**: Visible on mobile only
- **Action**: Opens mobile drawer with all header actions

---

### 2. Options Panel (Collapsible)

**Location**: Below header, above swatch strip\
**Toggle**: Click the Options (⚙️) button in header\
**Layout**: Responsive grid

#### 2.1 Border Width

- **Range**: `0` (None) to `5` (Thick)
- **Effect**: Controls interface border thickness

#### 2.2 Shadow Size

- **Range**: `0` (Flat) to `5` (Floating)
- **Effect**: Controls shadow elevation

#### 2.3 Shadow Opacity

- **Range**: `5` to `95` (%)
- **Effect**: Controls shadow transparency

#### 2.4 Roundness

- **Range**: `0` (Square) to `5` (Round/Pill)
- **Effect**: Controls border-radius

#### 2.5 Gradients

- **Range**: `0` (Solid) to `5` (Complex)
- **Effect**: Controls background gradient intensity and direction
- **Levels**:
  - 0: Solid
  - 1: Subtle Vertical
  - 2: Medium Vertical
  - 3: Subtle Diagonal
  - 4: Medium Diagonal
  - 5: Vivid/Complex

#### 2.6 Saturation

- **Range**: `-5` (Mono) to `+5` (Vivid)
- **Default**: `0` (Normal)
- **Effect**: Shifts color saturation relative to base hue

#### 2.7 Brightness

- **Range**: `-5` (Dark) to `+5` (Bright)
- **Default**: `0` (Normal)
- **Effect**: Compresses color dynamic range toward dark or light

#### 2.8 Contrast

- **Range**: `-5` (Soft) to `+5` (Max)
- **Default**: `0` (Normal)
- **Effect**: Controls light/dark text separation from background

---

### 3. Swatch Strip (Collapsible)

**Location**: Below options panel, above preview\
**Toggle**: Click the Palette (🎨) button in header\
**Layout**: 10 columns on desktop (lg), 5 on tablet (sm), 2 on mobile

#### 3.1 Compact Swatch Design

Each swatch displays:

- **Header Row**: Token name (uppercase) + Lock / unlock icon
- **Light/Dark Side-by-Side**: Two color rectangles showing light and dark
  values
- **Color Values**: Displayed inside each swatch with auto-contrasting text

#### 3.2 Swatch Interactions

- **Click on Swatch**: Copies color value to clipboard
- **Click Unlock Icon**: Turns unlock icon into lock icon and locks color to
  prevent change
- **Click Lock Icon**: Turns lock icon into unlock icon and unlocks color to
  allow change
- **Hover**: Scales slightly with shadow for visual feedback

#### 3.3 Token Display Order

1. `bg`
2. `card`
3. `text`
4. `textMuted`
5. `textOnColor`
6. `primary`
7. `secondary`
8. `accent`
9. `good`
10. `bad`

---

### 4. Preview Section (Split View)

**Location**: Main content area, takes remaining viewport height\
**Layout**: Side-by-side (50%/50%) on desktop, stacked on mobile

#### 4.1 Light Theme Preview (Left)

Displays sample UI components using the light theme colors.

#### 4.2 Dark Theme Preview (Right)

Displays sample UI components using the dark theme colors.

#### 4.3 Preview Components (Both Sides)

##### 4.3.1 Theme Badge

- Pill badge showing "Light Theme Preview" or "Dark Theme Preview"
- Uses `primary` color at 50% opacity with border and `card` color as background

##### 4.3.2 Main Heading

- "Taichi Theme Generator"
- Shows text gradient effect when gradients slider > 0

##### 4.3.3 Description Paragraph

- Uses `textMuted` for secondary text
- Contains inline code badges for `primary`, `secondary`, `accent` tokens

##### 4.3.4 Keyboard Hint

- "Press Space to generate..." instruction
- Uses `accent` color for the keyboard badge

##### 4.3.5 Image Section (Hero Banner)

- Large hero card with background image
- Gradient overlays using `primary` and `accent`
- "Premium Experience" badge using `secondary`
- Main headline with colored text spans
- Card float-up animation on hover

##### 4.3.6 Actions Section

Demonstrates button styles:

- **Primary Button**: Uses `primary` color + gradient (if enabled)
- **Secondary Button**: Uses `secondary` color
- **Accent Button**: Uses `accent` color
- **Outline Button**: Border-only with `card` background
- **Error Button**: Uses `bad` color
- **Success Button**: Uses `good` color
- **Icon Buttons**: Settings and Bell icons

##### 4.3.7 Input Fields Section

- Email input with icon
- Select dropdown
- Checkbox and radio buttons
- Volume/range slider

##### 4.3.8 Cards Section

- **Revenue Card**: Progress bar, stats, icon badge
- **Profile Card**: Avatar, tags, action button

##### 4.3.9 Feedback Section (Alerts)

- Info alert using `secondary`
- Error alert using `bad`
- Success alert using `good`

##### 4.3.10 Navigation Section

- Tab navigation with active state
- Breadcrumb navigation
- Avatar badge

##### 4.3.11 Footer

- Brand section with logo
- Link columns (Product, Resources, Legal)
- Social icons
- Copyright with version number

---

### 5. History Panel (Collapsible)

**Location**: Overlay from left side\
**Toggle**: Click History (📜) button

Contains:

- Scrollable list of previous themes
- Visual preview swatches for each
- Click to restore theme
- Clear history button

---

### 6. Share Modal

**Location**: Centered modal overlay\
**Toggle**: Click Share (🔗) button

Features:

- Shareable URL containing theme seed and settings
- Copy URL button
- Social share options

---

## Keyboard Shortcuts

| Key            | Action                      |
| -------------- | --------------------------- |
| `Space`        | Generate new theme          |
| `←` / `→`      | Navigate theme history      |
| `Cmd/Ctrl + Z` | Undo (go to previous theme) |
| `Cmd/Ctrl + C` | Copy theme URL              |

---

## URL Parameters

The application state is encoded in URL parameters for sharing:

| Param  | Description                                |
| ------ | ------------------------------------------ |
| `mode` | Generation mode (random, monochrome, etc.) |
| `seed` | Seed color hex value                       |
| `sat`  | Saturation level (-5 to 5)                 |
| `con`  | Contrast level (-5 to 5)                   |
| `bri`  | Brightness level (-5 to 5)                 |
| `bw`   | Border width (0-5)                         |
| `sh`   | Shadow strength (0-5)                      |
| `so`   | Shadow opacity (5-95)                      |
| `gr`   | Gradient level (0-5)                       |
| `rd`   | Radius level (0-5)                         |

---

## Color Generation Algorithm

### Base Hue Selection

1. **Random Mode**: Completely random base hue
2. **Harmony Modes**: Base hue with calculated complementary hues

### Saturation Application

- Level 0: Pure grayscale (0% saturation)
- Level 1-4: Mapped to ranges 15-25%, 40-50%, 65-75%, 90-100%

### Brightness Application

**Implementation** (via `applyBrightness` function):

- Applied to ALL color tokens
- Shift amount = proportional to distance from 50% gray
- Colors at 50% gray: no shift
- Colors near 0% or 100%: maximum shift toward center

**Level Effects**:

- Level 1 (Dim): Bright colors compressed 50% toward gray
- Level 2: Bright colors compressed 25% toward gray
- Level 3 (Normal): No change
- Level 4: Dark colors compressed 25% toward gray
- Level 5 (Bright): Dark colors compressed 50% toward gray

### Contrast Application

- Calculates text lightness as offset from background
- Higher contrast = greater offset
- Ensures minimum readability even at extremes

---

## Technical Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (via CDN)
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect, useCallback)
- **Persistence**: LocalStorage for history
- **URL Routing**: Browser History API

---

## File Structure

```
/
├── App.tsx                    # Main application component
├── types.ts                   # TypeScript type definitions
├── index.html                 # HTML entry with Tailwind config
├── components/
│   ├── PreviewSection.tsx     # Theme preview with UI components
│   ├── SwatchStrip.tsx        # Color swatch grid
│   └── ShareModal.tsx         # Share URL modal
└── utils/
    └── colorUtils.ts          # Color generation and conversion
```

---

## Known Issues / TODOs

1. **Mobile Experience**: Preview sections are constrained on mobile; recommend
   landscape or tablet.

---

## Version History

- **v25.12.1**: Added textMuted, textOnColor tokens; redesigned swatch strip;
  added brightness slider
- **v25.12.0**: Initial release with 8 swatch colors
