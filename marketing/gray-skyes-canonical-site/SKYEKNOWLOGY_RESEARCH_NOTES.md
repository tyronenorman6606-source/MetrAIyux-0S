# SkyeKnowlogy Research Notes

Research pass: 2026-05-20

These notes are source material for the Gray Skyes SkyeKnowlogy section. They are not a public proof wall. Public copy should feature the polished, live, sovereignty-forward architecture.

## Current Curation Rule

- Public-feature now: SOLEnterprises / ESTIFARR, kAIxU Gate Delta, Gateway13, SkyeDexia Adapter, QuantumSkyes Public OS, kAIxU Super IDE v1, Bob's Smoke Shop, Empire Pallets, SignIn Pro / NorthStar.
- Keep SkyeKnowlogy focused on the systems that support the sovereignty, auth, and infrastructure story cleanly.

## Live URL Findings

| Surface | URL | Current Read |
|---|---|---|
| SOLEnterprises / ESTIFARR gate | `https://solenterprises.org/` | Live access gateway for SOLEnterprises International Nexus & Holdings. Root and `/login` render "SOLE Access Gateway" and "ESTIFARR'S GATE: ALL ARE NOT PERMITTED" with SOLE key entry, sign-in, sign-up, and approval request controls. |
| kAIxU Inner Sanctum | `https://kaixu67.netlify.app/` | Live public guide. Raw HTML states 64 AI-powered apps, one gated intelligence, and zero provider keys exposed. Browser session routes through a boot/intro screen. |
| kAIxU Worker gate | `https://kaixu67.skyesoverlondon.workers.dev/` | Live protected worker. Root and generation endpoints return 401 without an app token. `/v1/models` is public and lists `kAIxU6.7-flash`, `kAIxU6.7-pro`, and `kAIxU-image`. |
| kAIxU Gate Delta | `https://kaixu67.netlify.app/gateway` | Live gateway console and implementation explainer. Documents `/v1/health`, `/v1/models`, `/v1/generate`, `/v1/stream`, app bearer tokens, server-side API keys, token rotation, and allowed origins. |
| SkyeDexia Cloudflare Adapter | `https://skydexia-cloudflare-adapter.graylondonskyes.workers.dev/` | Live Cloudflare Worker adapter. Health reports KV, audit KV, R2 artifacts, builds queue, guardrails, AI codegen requirement, and disabled template fallback. |
| Gateway13 | `https://skyesol.netlify.app/platforms-apps-infrastructure/kaixugateway13/` | Live historical admin/control surface. Shows customers, key issuance, sub-keys, rotate/revoke, usage, fuel station, platform control, billing, devices, exports, deploy proxy, and GitHub push gateway. |
| kAIxU Super IDE v1 | `https://kaixusuperide.netlify.app/` | Live polished browser IDE marketing/app surface. Presents code, data, deploy, live share, admin, vault, writing, API, DB, Git, tests, packages, logs, analytics, and billing lanes. |
| QuantumSkyes Public OS | `https://quantumskyes.netlify.app/` | Live public desktop/launchpad shell. Links to SkyeDexia, SkyeHands, SkyeSol, SOLEnterprises, Bob's Smoke Shop, C-Cloud Smoke Shop, MG Fresh Production, platform launchpad, and sitemap. |
| DeltaGate directive | `https://skyesol.netlify.app/platforms-apps-infrastructure/kaixudeltagate/` | Live implementation directive. Strong public architecture language: apps talk to the gate, the gate talks to providers, keys never leave the server, tokens are disposable. Live tester hits protected worker health and receives 401 without a token. |

## Narrative Takeaways For SkyeKnowlogy

- The gateway story predates FS27. SOLEnterprises / ESTIFARR is the first running gate lineage, and Gateway13 / DeltaGate show that provider hiding, disposable tokens, app-level authorization, and admin control existed before the current 0S lane.
- FS27/SkyGate/Free99 is the current consolidation layer, not the first attempt. Public copy should say it is the newest shared owner/auth lane built on top of earlier gate discipline.
- The sovereignty angle is concrete: keys stay server-side, clients do not get trapped in a vendor portal, app tokens can be rotated, and architecture can move across Netlify, Cloudflare Workers, Pages, KV, R2, queues, and 0S-mounted paths.
- The client-facing examples should stay polished and practical first: Bob's, Empire Pallets, SignIn Pro / NorthStar, plus SOLEnterprises as a gate example.
- Unpolished surfaces should not appear on the public page.

## Artifacts

- Browser inspection JSON: `test-artifacts/skyeknowlogy-research-2026-05-20/live-url-inspection.json`
- SOLEnterprises inspection JSON: `test-artifacts/skyeknowlogy-research-2026-05-20/solenterprises-org-inspection.json`
- Screenshots folder: `test-artifacts/skyeknowlogy-research-2026-05-20/`
