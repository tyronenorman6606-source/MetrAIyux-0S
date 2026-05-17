# Skye Design Agent Directive

Use this directive when an agent is generating, reviewing, or repairing a public website from this design lab.

## Mission

Build premium, cinematic, client-facing product experiences. Do not generate generic SaaS landing pages.

## Hard Rules

- Do not create a first viewport with a giant left text column and a disconnected image on the right.
- Do not put long paragraphs in the hero.
- Do not expose MCP internals, smoke-test strings, internal proof filenames, or database logs on public pages.
- Do not use negative letter spacing.
- Do not let the hero image fall below the mobile viewport unless the design intentionally stages it there.
- Do not ship without browser screenshots on desktop and mobile.
- Do not use card grids as the main design idea. Cards support the story; they are not the story.

## Required Composition

Every public page must choose one of these first-viewport patterns:

- Cinematic command hero with a 3D/product/founder/artifact subject.
- Full-bleed editorial hero with real media and short copy.
- Interactive scroll-opening scene with visible CTA.
- App/tool surface as the first screen when the product is an actual app.

## Required Visual QA

Before deploy, run browser checks for:

- `1440x1000` desktop screenshot.
- `390x844` mobile screenshot.
- No horizontal scroll on mobile.
- H1 contained and readable.
- Primary CTA visible.
- Main subject visible.
- No hidden old-brand or placeholder text.

## Copy Rules

Public copy should sound like buyer-facing authority:

- "Proof-backed deployment"
- "Operator handoff"
- "Private access"
- "Restore-tested backups"
- "Client-ready dashboard"

Avoid public copy like:

- "MCP smoke proof"
- "0 checks"
- "build artifact not found"
- "internal script"
- "worker debug"

## Preferred Stack

- `motion` for layout and interaction motion.
- `gsap` + `ScrollTrigger` for scroll funnels.
- `lenis` for smooth scroll.
- `three`, `@react-three/fiber`, `@react-three/drei`, and `@react-three/postprocessing` for living scenes.
- `lucide-react` for interface icons.

## Source of Taste

Use these reference files before designing:

- `../skyesol_spectacle_reference/notes/spectacle-style-system.md`
- `../skyesol_spectacle_reference/notes/deep-scan-summary.md`
- `../skyesol_spectacle_reference/assets/`
