# QuantumSkyes Design MCP

This MCP server is for design reference and generation quality. It should not be used as a dumping ground for database smoke tests, auth logs, build logs, customer records, or deployment artifacts.

## Purpose

Expose a clean design brain to agents and users:

- Skye/Spectacle style rules.
- Approved high-end page patterns.
- Forbidden ugly generation patterns.
- User documentation.
- Builder documentation.
- Browser QA requirements.
- Component/use-case planning with runtime stack enforcement.

## Core Rule

Generate cinematic product experiences, not generic landing pages.

## Advanced Stack Rule

When the MCP brief requires advanced tools, generated work must prove it with source:

- Three/R3F scenes need real `three` or `@react-three/fiber` imports.
- Scroll funnels need real `gsap`, `ScrollTrigger`, and `lenis` imports.
- Motion systems need real `motion` imports or a documented local equivalent.
- Vector/canvas motion systems need real dotLottie, Rive, OGL, Pixi, or Theatre imports when those are selected.
- Neon browser chrome needs a real custom scrollbar, scroll progress, pointer-reactive polish, and reduced-motion/mobile fallbacks. Pull `neon-motion-chrome` instead of only saying "neon".
- The `design_stack_audit` tool must pass before the work is described as advanced.
- The `design_runtime_stack_gate` tool must pass with browser runtime evidence before MCP-driven stack work is called done.
- The `design_performance_audit` tool must pass before advanced motion/WebGL/screenshot-heavy work is shipped.

The MCP must reject package-only installs, prose-only claims, repeated dark card templates, lazy Lenis tuning, uncapped WebGL DPR, oversized particles, eager screenshot media, and missing motion fallbacks.

## Logo Rule

Existing logo, mark, emblem, and wordmark assets must be used before generating a new mark. Call `design_logo_manifest` before changing brand identity and `design_logo_audit` before shipping. Rounded-square initial badges, CSS-generated logo tiles, and random stock-style icons are rejected unless the user explicitly chose that exact identity direction.

## Surface Video Rule

When actual screenshots need to feel alive, read `quantumskyes://design/surface-video-reel` and generate a real MP4/WebM with Playwright/ffmpeg when available. When copy says the app does a workflow, record the browser doing that workflow; static screenshots are only secondary receipts. The page should render the reel as HTML video and browser QA must prove it is visible and playing.

## Living Background Rule

When the user asks for SkyeSol-style alive backgrounds, living pages, command fields, aurora motion, or spectacle atmosphere, pull `design_pattern_pack({ patternId: "skyesol-living-background" })`. The shipped page must include a real runtime canvas or WebGL layer with aurora/shader bands, gold/violet/cyan particles, pointer or scroll parallax, scanline/grain texture, capped DPR, compact/mobile reduction, and reduced-motion fallback. Static radial gradients, decorative orbs, and prose-only claims do not pass.

## Website Generation Flow

1. Read `quantumskyes://directives/index`.
2. Read `quantumskyes://design/registry`.
3. Read `quantumskyes://design/component-use-cases`.
4. Read `quantumskyes://design/open-source-stack`.
5. Read `quantumskyes://design/stack-catalog` when the user asks for GSAP, Framer Motion, Three.js, R3F, shaders, vector motion, or "all the good animation stuff."
6. Read `quantumskyes://design/pattern-manifest`.
7. Read `quantumskyes://design/logo-standards` when the page has any brand mark.
8. Read `quantumskyes://design/surface-video-reel` when screenshot animation, workflow proof, or video proof is requested.
9. Call `design_compose_brief`.
10. Call `design_component_plan` to select use cases/components and stack mode.
11. Call `design_recipe_plan` for the product and requested effects.
12. Call `design_stack_catalog` when choosing packages.
13. Call `design_open_source_stack` for recipes that match the requested libraries/effects.
14. Call `design_logo_manifest` before drawing, replacing, or styling any logo.
15. Call `design_pattern_pack` for every required implementation pattern.
16. Use `design_pattern_pack({ patternId: "neon-motion-chrome" })` when the brief asks for the Legal Skyes scrollbar, neon scroll chrome, cursor trail, scroll progress, shimmer text, or stronger page motion.
17. Use `design_pattern_pack({ patternId: "skyesol-living-background" })` when the brief asks for SkyeSol-style living/alive backgrounds or command-field atmosphere.
18. Build from those real implementation patterns, not from a static lookalike.
19. Read `quantumskyes://content/first-person-operator-voice` when writing public copy.
20. Call `design_content_generate` for first-pass hero/section/CTA/proof copy, or `design_content_audit` on hand-written copy.
21. Call `design_e2e_proof_audit` when public copy claims signup, auth, routing, restore, monitoring, filtering, deploy, handoff, or other app behavior.
22. Call `design_validate` on the public copy/markup/source.
23. Call `design_logo_audit` when a logo, brand mark, wordmark, or nav identity appears.
24. Call `design_stack_audit` when the brief requires Framer Motion, GSAP, Lenis, Three, R3F, Drei, postprocessing, Theatre, dotLottie, Rive, OGL, or Pixi.
25. Call `design_runtime_stack_gate` with source, package JSON, selected components/required stack, and browser runtime evidence.
26. Call `design_effect_audit` when screenshots, cursor trail, scrollbar, motion chrome, text effects, Theatre, scroll, or 3D are requested.
27. Call `design_performance_audit` before browser QA.
28. Run browser screenshots and runtime checks.
29. Fix before deploy.

## Public Page Safety

Public pages must not include:

- MCP smoke proof text.
- `0 checks` style test output.
- Internal build/debug messages.
- Secret names or credential references.
- Raw database proof logs.

Those belong in private operator/proof surfaces only.
