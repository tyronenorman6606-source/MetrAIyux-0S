# Advanced Stack Guidance

The MCP should recommend these only when they serve the page.

Before applying brand styling, pull concrete recipes from `quantumskyes://design/open-source-stack` or `design_open_source_stack`. The open-source stack is the implementation layer; Skye/Spectacle is only taste and QA.

## Motion

- `motion` for component-level transitions, layout movement, hover, reveal, and microinteraction.
- `framer-motion` when a request names Framer Motion or the project already uses that package.
- `gsap` + ScrollTrigger for pinned scroll stories, cinematic product funnels, and timeline control.
- `lenis` for smooth scroll when scroll motion is part of the experience.
- `@lottiefiles/dotlottie-web` or `@lottiefiles/dotlottie-react` for real vector motion assets when a custom animated media object is stronger than another CSS glow.
- `@rive-app/react-canvas` for interactive vector state-machine assets when a real `.riv` file exists.
- Theatre.js when a hero or 3D scene needs keyframed art direction instead of purely code-timed motion.
- OGL for lightweight custom shader backdrops when React Three is too much.
- PixiJS for sprite-heavy 2D scenes, game-like UI, and particle layers.

## Free Motion Sources To Check First

- GSAP: Webflow made GSAP free for commercial use in 2025. Use it for ScrollTrigger, timelines, and complex choreography.
- Motion: free/open-source animation library for React, JavaScript, and Vue. Use it for UI motion, scroll progress, layout movement, and pointer-reactive polish.
- Lenis: open-source smooth scrolling with platform-friendly behavior. Use it only when the scroll experience is part of the page concept.
- dotLottie Web: official LottieFiles player for Lottie/dotLottie web animations, including modern rendering backends. Use it for real reusable vector motion assets.
- Rive: use real `.riv` assets for interactive vector motion and state machines.
- Theatre.js: browser-based motion direction for DOM/WebGL variables. Use it for cinematic scenes that need a designer-style timeline.
- OGL / PixiJS: use these when a lightweight shader or sprite canvas is a better fit than Three.js.
- Animata / React Bits: free/open-source copyable animated component references. Use them as inspiration or source-owned snippets, not as a pile of unrelated effects.

## WebGL / Three.js

- `three` and React Three Fiber for living product scenes.
- Drei for helpers, controls, loaders, and scroll scenes.
- Postprocessing for bloom, vignette, depth, and glow.

## Rules

- Do not use WebGL as decoration when a real screenshot, app surface, or founder image is the stronger subject.
- Do not scroll-jack basic pages.
- Always provide reduced-motion fallback.
- Always test mobile performance and layout.
- Keep premium motion crisp: Lenis `lerp` should normally be `0.14` or higher, WebGL DPR must be capped near `1.5`, and particle counts should drop on compact/mobile screens.
- Lazy-load and async-decode screenshot/product media outside the first viewport.
- Advanced stack must appear in source imports and runtime behavior.
- Package installs without imports fail `design_stack_audit`.
- Slow scroll, uncapped DPR, oversized particles, eager screenshots, and missing motion fallbacks fail `design_performance_audit`.
- Static canvas, CSS-only glow, or card grids cannot be described as Three.js, GSAP, Lenis, R3F, Drei, or postprocessing work.

## Surface And Effect Rules

- Use actual product/app screenshots when they clarify the product better than illustration.
- Use neon/glowing text, shimmer, split text, or chromatic text effects as purposeful visual hierarchy.
- Use cursor trails or pointer-reactive glow for premium interactive pages, with mobile/reduced-motion fallbacks.
- Use a thicker branded scrollbar with a visible slightly opaque track and neon thumb/track highlights on scroll-led spectacle pages.
- Legal Skyes-style browser chrome should be a reusable system: neon scrollbar, top scroll progress rail, pointer-reactive glow, scanline/grid texture, shimmer title utility, and magnetic control utility.
- Do not hide custom scrollbars, make them ultra-thin, or rely on hover-only visibility when the user asked for visible scrollbars.
- Sticky scroll cues are allowed when they help users understand a long cinematic page.
