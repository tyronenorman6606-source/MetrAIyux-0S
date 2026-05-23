# Skye Design Lab

Skye Design Lab is a local advanced design kit for cinematic, MCP-ready web experiences.

It exists because generic AI landing pages are not good enough. The lab gives builders and agents a better source of taste: motion, scroll choreography, Three.js scenes, proof panels, and strict browser QA.

## Live Remote MCP

The deployed lab lives at `https://skye-design-mcp.pages.dev/`.

- Public guide: `https://skye-design-mcp.pages.dev/use-mcp.html`
- Protocol endpoint: `https://skye-design-mcp.pages.dev/mcp`
- Health proof: `https://skye-design-mcp.pages.dev/health`

Production MCP access is gate-owned. Users enter through the MetrAIyux 0S gate, provide an email, use their 0S/FS27/NorthStar gate session as a bearer token, and then connect their MCP client to the same-domain `/mcp` endpoint. Owners can use `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html` to exchange the owner admin code for a signed bearer. The Pages worker validates both user gate sessions and owner admin sessions through the combined 0S introspection route.

## World-Building Upgrade

The MCP now has a new Remix 3 beta operator console in `../operator-console-remix`. It is not a replacement for the `/mcp` protocol Worker. It is the first control room for the next MCP standard: physical metaphors, gate-owned entry rituals, real open-source scene/motion stacks, and browser proof receipts.

It now performs real local operator work:

- `/api/catalog` lists live local MCP resources/tools.
- `/api/plan` asks the MCP for world recipe/component/variety/quality plans.
- `/api/build` creates a portable generated world artifact with keypad entry, room reveal, and MCP receipt binding.
- `/api/mine` runs `npm run mcp:mine -- <target>` against whitelisted repo targets.
- `/api/proof` aggregates production health, target receipts, and browser proof artifacts.

The public same-domain generated artifact currently shipped with this lab is:

```text
https://skye-design-mcp.pages.dev/worlds/house-threshold/
```

Run it from the MCP package root:

```sh
npm run console:remix:dev
```

The research brief is in `../WORLD_BUILDING_MCP_RESEARCH.md`.

Repo proof:

```bash
npm run mcp:smoke:remote
MCP_LIVE_SIGNUP_SMOKE=1 MCP_RUNNER_TARGET=MCP npm run mcp:smoke:remote:gate
```

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
