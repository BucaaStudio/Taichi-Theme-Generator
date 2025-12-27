Below is your updated product design document with the optimized
color-generation system integrated. All UI/UX sections are preserved. Only the
architecture & algorithm sections are upgraded.

You can paste this directly over the corresponding parts of your doc.

⸻

Taichi Theme Generator – Product Design Document

Version: 25.12.2 Last Updated: 2025-12-27

⸻

🧠 Core Design Upgrade: Palette Intelligence Engine

New Core Principles 1.	All color computation happens in OKLCH 2.	Light mode is
generated first 3.	Dark mode is derived deterministically from light mode
4.	Every palette is scored, validated, and reproducible

This replaces the prior ad-hoc RGB/HSL manipulation model.

⸻

🎨 Extended Semantic Token Model

Visible Tokens (unchanged)

bg, card, text, textMuted, textOnColor, primary, secondary, accent, good, bad

Internal Tokens (expanded)

card2, border, ring, primaryFg, secondaryFg, accentFg, goodFg, badFg, warn,
warnFg

New Structural Tokens

neutralScale[0..900] primaryScale[0..900]

Used for hover/active/disabled states and gradient generation.

⸻

⚙️ Color Generation Pipeline (Rewritten)

Step 1 — Normalize Inputs

All colors are converted to OKLCH at the start.

Color = { L, C, H }

Utility functions: •	toOklch() •	toHex() •	contrastRatio(fg, bg)
•	clampToSRGBGamut(color) •	deltaE(a, b)

Test: 100 random colors round-trip without invalid RGB.

⸻

Step 2 — Base Hue & Harmony Candidate Generation

Harmony modes now generate candidate sets, not final colors.

Mode	Hue Offsets Monochrome	0 Analogous	±30° Complementary	+180°
Split-Comp	+150°, +210° Triadic	+120°, +240° Tetradic	+90°, +180°, +270°
Compound	base + complement pair Triadic-Split	120° ±150°

For each hue: generate 6–10 chroma samples and 2–3 lightness anchors.

Test: Debug panel shows candidate hue wheel with no duplicates.

⸻

Step 3 — Neutral Foundation (Light Mode First)

Neutral ramp built before brand colors.

Token	OKLCH L target bg	0.97 card	0.93 card2	0.90 text	0.18 textMuted	0.42
border	0.82

Slight hue bias from base hue (warm/cool).

Test: UI preview readable with no brand colors applied.

⸻

Step 4 — Primary & Accent Construction

From candidates, select best primary via scoring.

Generate:

primaryScale[50..900]

Assign:

primary = scale[600] primaryHover = scale[700] primaryActive = scale[800]
primaryFg = auto-computed for contrast

Accent chosen from remaining candidates with deltaE(primary, accent) >=
threshold.

Test: Button states remain legible & distinct.

⸻

Step 5 — Deterministic Dark Mode Derivation

For every light token:

dark.L = 1 - light.L ± offset dark.C = light.C * 0.8 dark.H = light.H

Clamp ranges:

Token	Dark L bg	0.05–0.08 card	0.10–0.15 text	0.90–0.96

Foreground tokens recomputed for contrast.

Test: Toggling modes preserves brand identity.

⸻

Step 6 — Scoring & Rejection Engine

Hard Rejects: •	Any text contrast < 4.5:1 •	Out-of-gamut after clamp •	Primary
too close to danger/warn •	Insufficient separation: •	deltaE(primary, accent) <
X •	deltaE(bg, card) < Y

Soft Scores: •	Contrast headroom •	Harmony consistency •	Chroma balance •	UI
usability •	Aesthetic bias

Pick highest score.

Test: Top palette stable across reruns with same seed.

⸻

Step 7 — Seeded Generation & History

Each palette stores:

seed, mode, baseHue, fullPaletteJSON

Spacebar regeneration is fully reproducible.

Test: Same seed = identical palette.

⸻

Step 8 — UI Validation Scenes

Both previews render: •	Typography scale •	Button states •	Inputs •	Cards
•	Alerts •	Tabs, nav, footer •	Gradients & shadows

Automated screenshot diff detects regressions.

⸻

Step 9 — Export & Locking

Exports: •	CSS variables •	Tailwind config •	JSON tokens

Locks: •	Base hue •	Neutral temperature •	Contrast level (AA/AAA)

⸻

🧪 New Quality Guarantees

Rule	Guaranteed Contrast	WCAG AA+ Dark/Light Identity	Mathematical Brand
Consistency	Hue preserved Visual Stability	Scored & tested
Reproducibility	Seeded RNG

⸻

🧱 File Additions

utils/ paletteEngine.ts scoringEngine.ts oklch.ts contrast.ts

⸻

🏁 Version History Update •	v25.12.2 — Introduced OKLCH engine, deterministic
dark mode, scoring & validation system
