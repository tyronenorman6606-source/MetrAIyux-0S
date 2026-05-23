# 0S Operator UI Rebuild Directive

Date: 2026-05-20  
Status: Active directive  
Primary target: `client-app-factory`  
Secondary backlog: `SkyeWebCreatorMax`, `Northstar`, `Relay13 admin`, `HouseOperations _legacy_shell`, `SkyeRouteX`, `SkyeMusicNexus` tool cluster, `saas` customer shells, `ConnectLog` app surface

## Why this exists

This directive exists to stop drift.

The current operator/build surfaces in 0S repeatedly fall into the same bad UI/UX pattern:

- oversized single-page dashboard shells
- long stacked panels with weak hierarchy
- console-first or command-center presentation
- too many responsibilities in one view
- “platform” styling without product clarity
- routes that technically exist but still feel like fragments of the same giant dashboard

This directive locks the rebuild standard before implementation begins, so the work does not slide back into panel-grid garbage or terminal cosplay.

---

## Non-negotiable design direction

The rebuild must produce a **real app**, not a dashboard skin.

### Hard rules

1. No docked dashboard UI as the dominant interaction model.
2. No command-first, terminal-first, or operator-console-first visual structure.
3. No giant single-page room shells with tabbed content blocks pretending to be separate tools.
4. The page count must increase substantially by splitting long multi-purpose surfaces into distinct routes.
5. Every route must have one clear job.
6. Auren must be integrated as a real assistant experience, not a small chat box stapled to a control panel.
7. Debug, proof, runtime, and raw console material must be available, but visually subordinated behind support layers, drawers, or dedicated review pages.
8. The public-facing experience of the app must feel like a **studio / foundry / production suite**, not an internal admin panel.

### Explicitly rejected patterns

- “Operations / Intake / Scanner / Assets / Design / Builder / Proof / Deploy” all on one long page
- panel-grid as the primary product language
- giant preformatted log blocks as first-class layout anchors
- sidebar + rail + console center layouts unless used in a narrowly scoped internal subtool
- dashboard cards as the default solution for every problem
- shipping runtime scaffolding language as user-facing UX

---

## Primary target: Client App Factory

### Current problem

`client-app-factory` currently behaves like a long multi-room dashboard shell instead of a focused production application.

Live route:

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/`

MCP receipt:

- `client-app-factory/MCP_TOOLING_RECEIPT.json`

### Required transformation

Rebuild `client-app-factory` into a true multi-page product surface.

### Required route model

The factory should be restructured into distinct pages with clear responsibilities. The exact names can change, but this separation must exist.

Required route families:

1. `home`
   - overview, active work, recent runs, entry points
2. `clients`
   - Valley selection, imported clients, search, filters
3. `client/:id`
   - high-level dossier for a single client
4. `surfaces`
   - live-surface scan, scraped assets, evidence, source confidence
5. `brand`
   - logo, mark, palette, type, identity choices
6. `media`
   - hero media, posters, gallery assets, QR, motion outputs
7. `design`
   - layout strategy, niche components, visual direction
8. `builder`
   - pipeline execution only
9. `generated-apps`
   - outputs, previews, route package inspection
10. `proofs`
   - Playwright proof, screenshots, video, route audit, asset validation
11. `deployments`
   - publish targets, promotion status, deployment actions
12. `auren`
   - assistant workspace, issue diagnosis, guided repair flow
13. `activity`
   - event timeline, run history, operator history
14. `settings`
   - environment wiring, platform configuration, defaults

This route expansion is intentional. The point is to kill the long-page dashboard disease.

### Required experience goals

The rebuilt factory must feel like:

- a premium production suite
- a client build foundry
- a media and app assembly studio
- an environment where outputs are visually reviewable, not merely logged

It must not feel like:

- a DevOps console
- an admin panel
- a CMS
- a shell script wrapped in buttons

### Auren requirements inside the factory

Auren must be upgraded from “assistant module” to “real integrated build partner.”

Auren must be able to:

- explain what broke
- point to the exact stage that failed
- suggest next actions in context
- help diagnose route failures, missing assets, bad surface harvests, and verification problems
- stay available from the client context and from the dedicated assistant page

Nice-to-have but desired:

- contextual suggestions tied to the current page
- per-client guidance
- auto-generated repair checklists
- “what should I do next?” flow support

---

## Implementation workflow requirement

For `client-app-factory`, use the local MCP tooling workflow from the repo instructions before and after major redesign work.

Required cycle:

1. `npm run mcp:mine -- /workspaces/MetrAIyux-0S/client-app-factory`
2. Read `client-app-factory/MCP_TOOLING_RECEIPT.json`
3. Apply redesign using MCP resources/patterns/audits where useful
4. Re-run the same MCP mine command after changes
5. Serve and browser-test the same target

Important override:

If MCP patterns push the work toward terminal-first, dashboard-first, docker-console, or command-center UI, they must be rejected in favor of the directive above.

---

## Verified sibling surfaces carrying the same disease

These were live-checked and returned `200` during the sweep on 2026-05-20.

### Tier 1: same core disease

#### Client App Factory

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/`

#### SkyeWebCreatorMax cluster

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/builder`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/dashboard`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/templates`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/runtime`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/preview`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/delivery`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/briefs`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Marketing-Made-Easy/SkyeWebCreatorMax/settings`

#### Northstar

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/northstar/`

#### Relay13 admin/operator cluster

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/relay13-core-v1.7-connectlog-operator-proof/public/admin/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/relay13-core-v1.7-connectlog-operator-proof/public/admin/inbox`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/relay13-core-v1.7-connectlog-operator-proof/public/admin/connect`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/relay13-core-v1.7-connectlog-operator-proof/public/admin/setup`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/relay13-core-v1.7-connectlog-operator-proof/public/admin/release`

### Tier 2: broader shell / panel / dashboard cousins

#### HouseOperations legacy shell

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/dashboard`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/alerts`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/assignments`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/runtime`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/schedule`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/settings`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/tasks`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/HouseOperations/_legacy_shell/vendors`

#### SkyeRouteX

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/dashboard`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/analytics`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/routes`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/stops`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/workforce`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/runtime`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/settings`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeRouteX/proof`

#### SkyeMusicNexus tool cluster

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/create`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/discover`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/daw`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/exports`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/feed`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/public/stems`

#### ConnectLog app surface

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/connectlog-v7.7-relay13-operator-proof/app`

#### SaaS customer shells

- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/customer-dashboard`
- `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/saas/customer-data`

---

## Execution order

This is the locked sequence unless the user changes it.

1. Rebuild `client-app-factory` first.
2. Show the result and confirm the new standard.
3. Use that standard to rebuild:
   - `SkyeWebCreatorMax`
   - `Northstar`
   - `Relay13 admin`
4. Then hit the broader cousins:
   - `HouseOperations _legacy_shell`
   - `SkyeRouteX`
   - `SkyeMusicNexus` tool cluster
   - `ConnectLog` app surface
   - `saas` customer shells

---

## Definition of done for the factory rebuild

The `client-app-factory` rebuild is not done until all of the following are true:

1. The long room-shell is gone.
2. The route count is substantially expanded.
3. The UI reads as a premium studio/foundry app instead of a dashboard.
4. Auren is integrated as a meaningful assistant experience.
5. Public and local Playwright proofs are green.
6. The generated-app workflow still works end to end.
7. MCP mine pass is rerun and documented after the redesign.
8. The new structure is good enough to become the model for the sibling rebuilds.

---

## Working note

This directive is intentionally opinionated.  
If implementation pressure pushes the work back toward panel-grid console shells, that is a failure, even if the code technically works.

