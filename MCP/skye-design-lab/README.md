# Skye Design Lab

Skye Design Lab is a local advanced design kit for cinematic, MCP-ready web experiences.

It exists because generic AI landing pages are not good enough. The lab gives builders and agents a better source of taste: motion, scroll choreography, Three.js scenes, proof panels, and strict browser QA.

## Start

```bash
npm install
npm run dev
```

Default dev port: `4333`.

## What Is Included

- React/Vite demo app.
- Motion, GSAP, Lenis, Three.js, React Three Fiber, Drei, postprocessing, Theatre.js, and Lucide.
- Local Skye reference assets copied into `public/assets`.
- MCP-facing registry and directive files.
- User and builder documentation.

## Important Files

- `src/main.tsx` - demo experience and component patterns.
- `src/styles.css` - Skye/Spectacle visual system implementation.
- `registry/skye-spectacle-registry.json` - reusable pattern metadata.
- `registry/agent-directive.md` - hard rules for AI agents.
- `docs/USER_GUIDE.md` - simple documentation for users.
- `docs/BUILDER_GUIDE.md` - technical documentation for builders.
- `docs/MCP_INTEGRATION.md` - how to connect this to your MCP workflow.

## Principle

Build cinematic product systems, not generic landing pages.
