# SkyeSol Spectacle Style System

## Core Palette

Primary SkyeSol shared CSS variables:

- `--dark: #0e0e1a`
- `--darker: #07070f`
- `--surface: #0c0c14`
- `--surface-2: #111119`
- `--surface-3: #181822`
- `--text: #e8e6e1`
- `--text-dim: #8a8880`
- `--gold: #c9a84c`
- `--gold-light: #e8d48b`
- `--accent-blue: #3a6fd8`
- `--accent-fire: #e84c30`

The cohort-platform style adds:

- `--gold: #f4c75b`
- `--violet: #8b5cf6`
- `--cyan: #7ee7ff`

Pattern: black/near-black foundation, gold authority, purple/cyan AI energy, fire-red action accent.

## Typography

The SkyeSol site uses imported display/editorial fonts:

- `Bebas Neue` for uppercase labels, metrics, nav branding, and compact authority text.
- `Playfair Display` for dramatic serif headlines.
- `Cormorant Garamond` for italic editorial/supporting copy.
- `DM Sans` for body/system text.
- `Fira Code` for admin/gated/tooling accents.

## Layout Motifs

- Fixed glass nav with blurred black background and gold hairline border.
- Massive first viewport with two-column hero: text on one side, founder/logo/object art on the other.
- Transparent/floating logo or founder image with glow, radial halo, and orbit/ring pseudo-elements.
- Thin gold dividers between full-width sections.
- Section label in tiny uppercase gold with wide letter spacing.
- Dense card grids with subtle borders, hover lift, top-gradient bars, and muted body text.
- Metrics as oversized Bebas numbers with small uppercase labels.
- Contact and proof sections framed as operating evidence, not marketing fluff.

## Motion Motifs

- `floatGlow`: vertical float plus drop-shadow glow.
- `floatGlowBlue` and `floatGlowFire`: same motion with colored glow families.
- `shimmer`: animated gradient text highlight.
- `fadeInUp`, `fadeInRight`, `reveal`, `reveal-left`, `reveal-right`: scroll reveal system.
- `glowPulseRing`: pulsing ring around hero/founder assets.
- `borderGlow`: slow border-color breathing.
- Metric counters via JS `data-count`.
- Hover cards lift with top bar expanding from `scaleX(0)` to `scaleX(1)`.

## Cinematic Intro

The intro overlay is a signature spectacle piece:

- Full-screen fixed layer with z-index around `98000`.
- Canvas rain/drops.
- Fog layers with blurred radial gradients drifting over time.
- White lightning flash layer with `mix-blend-mode: overlay`.
- Vignette and grain overlays.
- Centered "Skyes Over London" title, logo, and "Eminence In Motion" tagline.
- Timed reveal and fade-out, with a skip button.

Reusable idea: MetrAIyux can adapt this into a shorter "system boot" or "command chamber" intro, but keep it optional/skippable and avoid blocking core UX.

## Three.js Background

The main SkyeSol background uses:

- Transparent WebGL canvas fixed behind content.
- 2800 particles.
- Gold and purple particle palettes.
- Additive blending.
- Aurora bands as shader planes.
- Mouse parallax and scroll parallax.
- ACES tone mapping.

Reusable idea: make the MetrAIyux background feel like a living command field, not a static gradient.

## Components Worth Reusing

- Founder hero image with `floatGlow` and halo/ring pseudo-elements.
- Operator metric cards.
- Platform cards with top-line hover reveal.
- Gold outline/gold filled CTA pair.
- Glass nav with dropdown compression.
- Tiny operator labels: `SKYE-OPS //`, `Operator-grade`, `Proof-first`, `Governed AI`.
- Editorial founder sections that combine headshot, credibility, proof points, and contact.

## Do Not Reuse Blindly

- Do not copy the giant multi-dropdown nav without pruning; it is powerful but can become unusable.
- Do not make every section dark-card-heavy; use sections and dividers so it breathes.
- Do not rely on remote CDN image URLs where local extracted assets exist.
- Do not use all motion at once on low-power/mobile views; keep reduced-motion support in future production passes.
