# QuantumSkyes MCP World-Building Research

Generated: 2026-05-20

## Direction

The MCP should become a generator and auditor for immersive product worlds, not only a design prompt library. The core pattern is:

1. Pick a physical metaphor for the product.
2. Give the user an entry ritual.
3. Bind that ritual to real gate/session state.
4. Use open-source scene, motion, and proof tools to render the world.
5. Capture browser evidence so the claim is not decorative.

The first prototype is now `MCP/operator-console-remix`: a Remix 3 beta control room with a sidewalk/door/keypad metaphor, a live MCP status route, Three.js canvas runtime, GSAP/Lenis scroll choreography, pointer polish, and links into the 0S owner gate.

## Current Source Research

- Remix 3 beta is explicitly pre-production, but its stated direction is model-first, web-API-based, runtime-first app construction. Its beta preview positions routes, controllers, middleware, sessions, auth, assets, tests, and UI as small composable packages under one umbrella. Source: https://remix.run/blog/remix-3-beta-preview
- Remix API docs expose `createRouter`, `createController`, auth/session packages, static middleware, asset serving, and `runRemix`. This fits an MCP operator console where AI agents can reason about route ownership. Source: https://api.remix.run/
- The MCP TypeScript SDK documents Streamable HTTP as the recommended remote-server transport, with stdio still appropriate for local process-spawned integrations. Source: https://ts.sdk.modelcontextprotocol.io/documents/server.html
- Cloudflare Workers static assets can combine static files with Worker code, and `run_worker_first` can force Worker logic before assets for auth, logging, or HTML rewriting. Source: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- React Three Fiber's Canvas is the React portal into Three.js scenes, while Drei provides helper abstractions for R3F. Sources: https://r3f.docs.pmnd.rs/api/canvas and https://github.com/pmndrs/drei
- Theatre.js is built for professional timeline/keyframe direction across UI and Three.js scenes, which is exactly the missing layer for "walk up to the door, enter the code, reveal the room" motion direction. Sources: https://www.theatrejs.com/ and https://www.theatrejs.com/docs/0.5/getting-started/with-three-js
- GSAP ScrollTrigger supports scroll-linked storytelling patterns such as scrubbed and pinned stages. Source: https://gsapdemos.com/plugins/scroll/scrolltrigger
- Motion for React is positioned for production UI animation, gestures, layout animation, and scroll/gesture-driven transitions. Source: https://motion.dev/docs/react

## Stack To Pull In

Core protocol:
- `@modelcontextprotocol/sdk`
- `zod`
- Streamable HTTP on `/mcp`
- local stdio for repo-local clients

World renderer:
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `@react-three/postprocessing`
- `@theatre/core`
- `@theatre/studio`

Motion and scroll:
- `gsap`
- `lenis`
- `motion`
- `framer-motion` for React/R3F surfaces

Proof and quality:
- Playwright desktop/mobile browser QA
- video proof for workflow claims
- MCP `design_stack_audit`
- MCP `design_effect_audit`
- MCP `design_performance_audit`
- MCP `design_e2e_proof_audit`
- MCP `design_quality_gate`

Runtime/deployment:
- Cloudflare Workers/Pages for the current same-domain MCP
- Cloudflare Workers static assets for future Worker-first auth on immersive app shells
- 0S combined introspection for signed owner-admin and FS27/NorthStar sessions

## New MCP Product Standard

Every generated world needs these fields in its receipt:

- `archetype`
- `physicalMetaphor`
- `entryRitual`
- `firstViewportSubject`
- `gateBinding`
- `motionStack`
- `proofWorkflow`
- `browserQaArtifacts`
- `reducedMotionFallback`
- `mobileFraming`

Example:

```json
{
  "archetype": "house-threshold",
  "physicalMetaphor": "sidewalk-to-front-door",
  "entryRitual": "pin pad unlock",
  "firstViewportSubject": "doorway scene",
  "gateBinding": "owner-admin bearer or NorthStar session",
  "motionStack": ["three", "gsap", "lenis"],
  "proofWorkflow": "login -> introspect -> list MCP tools",
  "browserQaArtifacts": ["desktop screenshot", "mobile screenshot"],
  "reducedMotionFallback": "static doorway with visible controls",
  "mobileFraming": "door panel stacks under headline"
}
```

## What Changes In The Existing MCP

- The existing Skye Design Lab now has a `World OS` section.
- The hero copy now frames the MCP as world infrastructure, not only a remote endpoint.
- Remote endpoint cards now include the new Remix control-room source.
- The lab names open-source infrastructure by role: Remix 3, Three/R3F/Drei, GSAP/Lenis, Theatre.js, Motion, MCP SDK, and Cloudflare Workers.

## What The New Remix Console Is For

`MCP/operator-console-remix` is not replacing `/mcp`. It is a new operator surface for:

- live MCP health inspection,
- owner/admin entry metaphor,
- world archetype selection,
- stack discipline,
- proof workflow planning,
- direct local MCP resource/tool browsing through `quantumskyes`,
- generated world builds through `/api/build`,
- target mining via `npm run mcp:mine -- <target>`,
- receipt aggregation for world plans, target mining, production health, and browser proof.

The protocol remains on `https://skye-design-mcp.pages.dev/mcp`.

## Operator Console API

The local Remix cockpit now exposes these concrete routes:

- `GET /api/status` checks the deployed MCP `/health` route.
- `GET /api/catalog` connects to the local `quantumskyes` stdio MCP and lists resources/tools.
- `GET /api/targets` returns whitelisted repo targets and MCP receipt state.
- `GET /api/worlds` returns world archetypes such as house threshold, barber walkthrough, studio booth, dispatch floor, legal war room, and restaurant host stand.
- `GET /api/plan?target=<id>&archetype=<id>` calls MCP tools including `design_recipe_plan`, `design_component_plan`, `design_variety_plan`, and `design_quality_gate`.
- `GET /api/build?target=<id>&archetype=<id>` writes a portable generated world with keypad entry, room reveal, Three/GSAP/Lenis source signals, and a receipt.
- `GET /api/mine?target=<id>` runs the repo MCP mining command for that target.
- `GET /api/proof` aggregates remote health, target receipts, local plan/mine receipts, and browser proof artifacts.
- `GET /generated-worlds/<slug>` serves the generated artifact.

This makes the console useful as a local operator cockpit instead of only a visual prototype.

The current public proof artifact is mounted on the same production Pages domain:

```text
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

## Current Proof

- `npm run mcp:mine -- MCP` passes against the local `quantumskyes` MCP server.
- `npm run mcp:smoke:remote` proves the production `/mcp` endpoint is gate-owned, email-required, and blocks unauthenticated protocol calls.
- `MCP/operator-console-remix` typechecks and runs at `http://localhost:44100`.
- `MCP/skye-design-lab` builds with Vite 7 and previews at `http://localhost:44101`.
- Production deploy `b9592025-1e2e-4e6b-8acd-7ffdec052c69` is live on the `production` branch for `https://skye-design-mcp.pages.dev/`.
- Browser artifacts for the new control room and upgraded lab are in `test-artifacts/operator-console-remix/`.
