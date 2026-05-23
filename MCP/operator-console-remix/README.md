# QuantumSkyes MCP Control Room

This is the first operator-facing prototype for the "world-building MCP OS" direction.

Plain version: the MCP is still the engine. This Remix app is the cockpit where an operator can see the engine, pick a world pattern, check gate ownership, and eventually launch/audit immersive product sites.

It is not meant to be useful as "one more landing page." It is useful because it proves the next creation lane:

```text
idea -> physical metaphor -> entry ritual -> MCP recipe -> generated world -> live browser proof
```

For example, instead of making a barber website as a normal homepage, the MCP should help create a shop-world: sidewalk, front door, chair, service board, booking ritual, owner login, mobile proof, and browser-tested deployment.

## What It Does Today

- Shows the first world metaphor: sidewalk to door to keypad to owner access.
- Calls the live production MCP health route from the app.
- Lists real local MCP resources/tools through the repo's `quantumskyes` stdio server.
- Builds MCP-backed world plans for whitelisted repo targets and writes receipts.
- Builds portable generated world artifacts through `/api/build`.
- Serves generated worlds from `/generated-worlds/<slug>` with keypad entry, room reveal, Three/GSAP/Lenis runtime signals, and MCP-backed receipts.
- Runs `npm run mcp:mine -- <target>` from the console and records the result.
- Aggregates proof status from the live remote health route, target receipts, and browser artifacts.
- Names the stack expected for high-end worlds: Remix, Three.js, GSAP, Lenis, and the deployed MCP.
- Gives us a real codebase where future MCP tools can browse resources, choose patterns, and trigger proof workflows.

## Boundary

- It does not replace `https://skye-design-mcp.pages.dev/mcp`.
- It does not make the repo's local MCP unnecessary for authoring.
- It is not the paid/customer app.
- It is now a working operator cockpit: plan, build, mine, and proof are real local actions.

## Operator API

The app now exposes real local operator endpoints:

- `GET /api/status` checks production MCP health at `https://skye-design-mcp.pages.dev/health`.
- `GET /api/catalog` connects to the local `quantumskyes` MCP and lists resources/tools.
- `GET /api/targets` returns the whitelisted repo targets the cockpit can operate on.
- `GET /api/worlds` returns the available world archetypes.
- `GET /api/plan?target=operator-console&archetype=barber-shop` asks the MCP for recipe/component/variety/quality plans and writes receipts.
- `GET /api/build?target=operator-console&archetype=house-threshold` writes a generated world to `generated-worlds/<slug>/index.html`.
- `GET /api/mine?target=operator-console` runs `npm run mcp:mine -- MCP/operator-console-remix`.
- `GET /api/proof` aggregates live health, target receipts, latest plan/mine receipts, and browser proof files.
- `GET /generated-worlds/:world` serves the latest generated world artifact.

Receipts are written to:

```text
MCP/operator-console-remix/operator-receipts/
MCP/operator-console-remix/generated-worlds/
test-artifacts/operator-console-remix/
```

## Why It Exists

The current MCP can already provide design recipes, audits, pattern packs, and remote access. That is infrastructure.

The missing layer is an operator surface that turns those pieces into an actual workflow:

1. choose the product-world archetype,
2. bind it to the 0S gate or owner admin session,
3. select the motion/scene stack,
4. generate a portable world artifact or apply MCP parts to a target app,
5. run desktop/mobile browser proof,
6. publish the result with receipts.

That is what this app is being shaped into.

## Starter Shape

- `app/actions/controller.tsx` owns the top-level route actions.
- `app/routes.ts` defines the route contract.
- `app/router.ts` wires routes to handlers.
- `app/middleware/render.tsx` installs the request-scoped renderer used by actions.
- `app/ui/` holds the shared document shell and home page UI.
- `app/assets.ts` owns the server-side asset pipeline used by the asset route and renderer.
- `public/` contains static files served from the app root.

## What This Is

This app is not the MCP protocol server. The deployed protocol endpoint remains:

```text
https://skye-design-mcp.pages.dev/mcp
```

This is the control room beside it. It prototypes the kind of surface the MCP should be able to generate and audit: a sidewalk-to-door entry metaphor, owner admin handoff, live health route, world archetype matrix, open-source stack map, and proof route.

## Runtime Stack

- Remix 3 beta for model-first routes/controllers/assets.
- Three.js for the doorway/world canvas.
- GSAP + Lenis for scroll-stage choreography.
- GSAP for pointer polish and threshold-state motion.
- Live MCP health from `https://skye-design-mcp.pages.dev/health`.

## Growing The App

- Put top-level route actions in `app/actions/controller.tsx`.
- Add `app/actions/<route-key>/controller.tsx` when a nested route map needs its own actions or middleware.
- Add directories like `app/data/` or `test/` when the app actually needs them.
- Move shared UI into `app/ui/` once more than one route needs it.

## Commands

```sh
npm i
npm run start
npm test
npm run typecheck
npm run proof:local
```

From `MCP/`, use:

```sh
npm run console:remix:dev
npm run console:remix:typecheck
npm run console:remix:proof
```

## Proof Artifacts

Current local proof lives in:

- `test-artifacts/operator-console-remix/operator-console-e2e-proof.json`
- `test-artifacts/operator-console-remix/operator-console-generated-world-e2e.png`
- `test-artifacts/operator-console-remix/operator-console-desktop-e2e.png`
- `test-artifacts/operator-console-remix/operator-console-mobile-e2e.png`
