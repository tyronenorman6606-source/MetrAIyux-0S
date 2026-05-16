# Builder Guide: Skye Design MCP

## Resources

Important MCP resources:

- `quantumskyes://design/index`
- `quantumskyes://design/registry`
- `quantumskyes://design/user-guide`
- `quantumskyes://design/builder-guide`
- `quantumskyes://design/reference/style-system`
- `quantumskyes://content/first-person-operator-voice`
- `quantumskyes://directives/index`
- `design/docs/CLIENT_SETUP.md` for configuring users' MCP clients.

## Tools

- `design_find` searches design references.
- `design_validate` checks copy or markup against forbidden patterns.
- `design_content_generate` creates first-person operator/company copy from product, audience, offer, and concrete system components.
- `design_content_audit` rejects generic agency/platform copy and checks for immersive first-person singular/plural builder language.
- `design_stack_audit` verifies advanced-stack claims against real source imports/runtime usage.
- `design_effect_audit` verifies requested effects against real source signals.
- `design_performance_audit` rejects lazy Lenis, uncapped WebGL, heavy particles, eager screenshots, and missing motion/mobile fallbacks.
- `design_open_source_stack` returns concrete open-source recipes so output is not just SkyeSol styling.
- `design_recipe_plan` converts product/effect asks into required recipes, imports, and audits.
- `design_logo_manifest` lists approved logo, mark, emblem, and icon assets.
- `design_logo_audit` rejects generic generated logo badges and missing existing logo assets.
- `design_quality_gate` returns the required browser QA checklist.
- `design_e2e_proof_audit` rejects action/workflow claims backed only by static screenshots.
- `repo_read` reads bounded workspace files when needed.

## Integration Rule

Keep the MCP design server clean.

Allowed:

- Style notes.
- Pattern registry.
- Directives.
- User docs.
- Approved visual assets.

Not allowed:

- Auth logs.
- Database smoke output.
- API keys.
- Customer data.
- Deploy logs.
- Raw proof artifacts.

## Website Generation Flow

1. Read `quantumskyes://directives/index`.
2. Read `quantumskyes://design/registry`.
3. Read `quantumskyes://design/open-source-stack`.
4. Read `quantumskyes://design/pattern-manifest`.
5. Read `quantumskyes://design/logo-standards` when the page has any logo or brand mark.
6. Read `quantumskyes://design/surface-video-reel` when screenshot animation, app workflow proof, or video proof is requested.
7. Call `design_compose_brief`.
8. Call `design_recipe_plan` for the product and requested effects.
9. Call `design_open_source_stack` for recipes that match the requested libraries/effects.
10. Call `design_logo_manifest` before drawing, replacing, or styling any logo.
11. Call `design_pattern_pack` for every required implementation pattern.
12. Build from those real implementation patterns, not from a static lookalike.
13. Read `quantumskyes://content/first-person-operator-voice` when writing public copy.
14. Call `design_content_generate` for first-pass hero/section/CTA/proof copy, or `design_content_audit` on hand-written copy.
15. Call `design_validate` on the public copy/markup/source.
16. Call `design_logo_audit` when a logo, brand mark, wordmark, or nav identity appears.
17. Call `design_stack_audit` when the brief requires Framer Motion, GSAP, Lenis, Three, R3F, Drei, or postprocessing.
18. Call `design_effect_audit` when screenshots, cursor trail, scrollbar, text effects, Theatre, scroll, or 3D are requested.
19. Call `design_performance_audit` before browser QA.
20. Run browser screenshots.
21. Fix before deploy.

## Content Voice Rule

Founder-built systems should not sound like neutral agency brochures. Use first-person operator/company language:

- `I do not sell websites. I build control rooms for the business behind them.`
- `I built [product] to give [audience] [rooms/gates/proof] that can route the work after someone says yes.`
- `I show the public-safe receipts. Our protected rooms stay protected.`
- `We route the pressure through our brains, agents, gates, networks, and proof layers.`

Use `I` for founder conviction and direct accountability. Use `we/our` when referring to the company-scale machine: brains, AEs, agents, networks, gates, systems, operators, proof layers, and delivery lanes.

Fail examples:

- `We help businesses streamline operations.`
- `Our solutions help modern brands scale.`
- `Best-in-class platform for modern workflows.`

## Advanced Stack Enforcement

If a page is supposed to use advanced open-source frontend tools, the source must prove it.

Pass examples:

- `import * as THREE from 'three'`
- `import { motion, useMotionValue, useSpring } from 'framer-motion'`
- `import gsap from 'gsap'`
- `import { ScrollTrigger } from 'gsap/ScrollTrigger'`
- `import Lenis from 'lenis'`
- `import { motion } from 'motion/react'`
- `import { Canvas } from '@react-three/fiber'`

Fail examples:

- Package installed but never imported.
- Copy says "Three.js" but source has no Three/R3F import.
- Static cards pretending to be a command scene.
- Same dark dashboard/card layout reused with a new logo.

## Performance Audit Rule

Premium spectacle has to feel crisp, not heavy.

Pass examples:

- `new Lenis({ lerp: 0.18, smoothWheel: true })`
- `<Canvas dpr={[1, isCompact ? 1.05 : 1.25]} />`
- `const count = isCompact ? 520 : 980`
- `<img loading="lazy" decoding="async" />`
- `@media (pointer: coarse), (prefers-reduced-motion: reduce) { ... }`

Fail examples:

- Lenis `lerp: 0.08` on the main page.
- `<Canvas dpr={2}>` by default.
- 1800+ particles with no compact/mobile reduction.
- Screenshot grids using eager images below the fold.
- Cursor trails, fixed overlays, or scroll timelines with no mobile/reduced-motion fallback.

## Open-Source Recipe Rule

The MCP is not allowed to act like a SkyeSol restyler. It must pull implementation recipes by behavior:

- `framer-motion-interaction-system`
- `three-r3f-shader-scene`
- `drei-postprocessing-cinema`
- `gsap-lenis-scroll-stage`
- `theatre-directed-scene`
- `actual-surface-screenshot-stage`
- `actual-surface-video-reel`
- `brand-logo-asset-discipline`
- `neon-scrollbar-cursor-trail`
- `premium-text-effects-lab`

## Logo Audit Rule

Use real identity assets first.

Pass examples:

- `<img src="/assets/metraiyux-0s-logo-transparent.png" alt="MetrAIyux 0S">`
- A clean typography-only wordmark when no asset exists.
- Parent brand endorsement using an approved transparent logo asset.

Fail examples:

- `<span class="brand-mark-text">SOL</span>` as a fake logo.
- CSS-generated rounded squares with initials.
- Random shield, cube, spark, or circuit icon not present in the asset manifest.
- Replacing a finished transparent logo with a generic badge.

## Surface Video Rule

When actual screenshots need animated proof, create a real media asset. When copy says the app does a workflow, record the browser doing that workflow.

Pass examples:

- Playwright `recordVideo` of the actual click/fill/scroll/submit/route/auth/restore path.
- `ffmpeg` MP4/WebM reel generated from the action capture or dense frame sequence.
- `<video autoplay muted loop playsinline poster="...">` first in the proof stage.
- Browser E2E verifies video `readyState`, `currentTime`, and `paused === false`.
- `design_e2e_proof_audit` passes for any behavior claim.

Fail examples:

- CSS-only fades described as video.
- Stock image reels.
- Fake UI when actual screenshots exist.
- Static landing-page screenshot called proof for signup, auth, restore, routing, monitoring, deploy, or dashboard behavior.

## Effect Audit Rule

Requested effects must leave source evidence:

- Cursor trail: `cursor-trail`, `pointermove`, `useMotionValue`, or `useSpring`.
- Neon scrollbar: `::-webkit-scrollbar`, `scrollbar-color`, 14px+ thumb/track styling, visible slightly opaque track, and neon thumb highlight.
- Text effects: `text-shadow`, `background-clip: text`, glow/neon/split/shimmer classes.
- Surface screenshots: real image assets rendered in the page.
- Theatre: `@theatre/core`, `getProject`, or wired sheet state.
- GSAP scroll: `ScrollTrigger`, `gsap.registerPlugin`, `scrub`, or `pin`.
- Three/R3F: `<Canvas>`, `useFrame`, `THREE`, or R3F imports.
