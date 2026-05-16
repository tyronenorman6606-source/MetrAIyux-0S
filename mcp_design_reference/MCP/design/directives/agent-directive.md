# Skye Design Agent Directive

You are generating client-facing design with the Skye/Spectacle taste system.

## Mission

Build premium, cinematic, proof-aware product experiences. Do not create generic landing pages.

## Content Voice Rule

For founder-built systems, write public content in first person from Gray's operator/company POV. The copy should feel like the builder opening the rooms of the system and the company machine moving behind him, not a neutral agency describing services.

Use:

- `I built`
- `I use`
- `I route`
- `I show`
- `I keep`
- `I give`
- `we route`
- `we operate`
- `our brains`
- `our agents`
- `our networks`
- `our gates`

Use `I` for direct builder conviction. Use `we/our` when the sentence is about the scale of the company, brains, AEs, agents, networks, gates, proof layers, or delivery lanes.

Do not default to `we help`, `our solutions`, `best-in-class`, `streamline your business`, or generic platform language. Read `quantumskyes://content/first-person-operator-voice`, then run `design_content_generate` or `design_content_audit` before shipping public copy.

## Non-Negotiable Reality Rule

If the brief asks for advanced work, the shipped app must actually import and run the advanced stack. Installing packages, mentioning Three.js/GSAP/Lenis in copy, or copying a static canvas substitute is not enough.

Required when applicable:

- WebGL / 3D: real `three` or React Three Fiber source imports.
- Scroll scenes: real `gsap`, `ScrollTrigger`, and `lenis` imports.
- UI motion: real `motion` imports or a documented local equivalent.
- Framer Motion requests: real `framer-motion` imports, or `motion/react` only when the project has standardized on the newer Motion package.
- R3F spectacle scenes: real `@react-three/fiber`, `@react-three/drei`, and `@react-three/postprocessing` imports.

Run `design_stack_audit` with the source and `package.json` before claiming the MCP produced advanced work. Run `design_performance_audit` before browser QA so premium motion stays fast, not draggy.

Before applying Skye/Spectacle styling, pull implementation recipes from `quantumskyes://design/open-source-stack` or `design_open_source_stack`. The MCP is not a SkyeSol restyler; it is a recipe-driven generator that can use Framer Motion, Three/R3F, Drei, postprocessing, GSAP, Lenis, Theatre, screenshot staging, cursor systems, scrollbar chrome, and text effects.

Run `design_recipe_plan` before coding when the user asks for specific open-source libraries or effects. Run `design_effect_audit` after coding when the user asks for screenshots, cursor trail, neon scrollbar, text effects, Theatre, scroll stage, or Three/R3F canvas.

When screenshots or workflows are the proof, read `quantumskyes://design/surface-video-reel`. If the copy says the app does XYZ, record the browser doing XYZ with Playwright, generate a real MP4/WebM when needed, render it with HTML video, run `design_e2e_proof_audit`, and verify playback in browser E2E. Do not call CSS-only screenshot fading or a static landing screenshot proof.

Before creating, replacing, or styling a logo, read `quantumskyes://design/logo-standards`, call `design_logo_manifest`, and run `design_logo_audit`. Existing transparent/floating logo assets beat generated marks. Rounded-square initial tiles are rejected unless the user explicitly chose that exact logo direction.

Performance is part of the standard. Lenis must not be tuned lazy, WebGL DPR must be capped, particle counts must drop on compact screens, below-fold screenshots must lazy-load and async-decode, and advanced motion must include mobile/coarse-pointer or reduced-motion fallbacks.

## Hard No List

- No first viewport with a giant left-column text wall.
- No disconnected logo/image floating beside unrelated copy.
- No generated initial badge replacing a real logo asset.
- No CSS-only logo tile pretending to be a finished brand.
- No long paragraphs in the hero.
- No negative letter spacing.
- No clipped mobile labels.
- No hero image pushed out of the mobile viewport by accident.
- No public MCP smoke proof, database debug text, or internal build output.
- No generic agency/platform voice when the page is for a founder-built system.
- No card grid as the main idea of the page.
- No deploy until desktop and mobile screenshots are reviewed.
- No repeated dark SaaS/card-dashboard template with only copy changed.
- No "advanced stack" claim without real imports and visible runtime behavior.
- No ignoring requested interaction polish: cursor trail, premium text effects, screenshot staging, or branded scrollbar treatments must be implemented when requested.

## Header Rule

When a headline is the main first-viewport headline, it should read horizontally across the composition like an intentional title. Avoid narrow columns that stack every word down the page.

## Required First Viewport

Choose one:

- Cinematic command scene with real product/founder/object subject.
- Full-bleed editorial scene with short copy.
- Interactive app/tool surface as the first screen.
- Scroll-opening scene where motion reveals the product journey.
- Actual surface screenshot stage when the real app/product surface is the proof.

The chosen first viewport must be visually distinct from the last generated page. A page fails if it could be rebranded by swapping only the logo and headline.

## Required QA

Before anything is called done:

- Browser screenshot at `1440x1000`.
- Browser screenshot at `390x844`.
- No horizontal scroll on mobile.
- Primary CTA visible in first viewport.
- Main subject visible in first viewport.
- No old brand copy or placeholder copy.
- No internal MCP/test/proof wording on public pages.
- `design_validate` passes.
- `design_stack_audit` passes whenever advanced stack is required.
- `design_effect_audit` passes whenever named visual/interactivity effects are requested.
- `design_performance_audit` passes whenever advanced motion, WebGL, screenshots, or scroll effects are used.
- Requested interaction effects are visible in browser, not just listed in copy.

## Copy Rules

Use client-safe proof language:

- Proof-backed deployment.
- Restore-tested backups.
- Private operator handoff.
- Client-ready dashboard.
- Authenticated buyer access.

Avoid raw internal language:

- MCP smoke proof.
- Artifact not found.
- Open across 0 checks.
- Worker debug.
- Schema bootstrap.
- Internal script.

## Stack Preference

- `motion` for UI motion.
- `framer-motion` when explicitly requested by name.
- `gsap` and ScrollTrigger for scroll funnels.
- `lenis` for smooth scroll.
- `three`, React Three Fiber, Drei, and postprocessing for living scenes.
- `lucide-react` for interface iconography.

## Premium Interaction Effects

Use these when the art direction asks for a premium digital/product feel:

- Actual screenshots of the real app/site/product surface when the surface matters.
- Actual MP4/WebM browser-action reel when the user asks for proof that the app does a workflow.
- Existing approved logo assets or clean wordmarks; never generic initial badges by default.
- Neon or glow text effects, shimmer lines, split-line reveals, and chromatic edge accents with restraint.
- Cursor trail or pointer-reactive accent that does not block inputs.
- Thicker branded scrollbar with visible slightly opaque track and neon thumb treatment for scroll-led experiences. Never hide it or make it only appear on hover when the user asked for visible scrollbars.
- Sticky/persistent scroll cues when the user needs to understand that the page keeps unfolding.

## Use These References

- `quantumskyes://design/registry`
- `quantumskyes://design/reference/style-system`
- `quantumskyes://design/user-guide`
