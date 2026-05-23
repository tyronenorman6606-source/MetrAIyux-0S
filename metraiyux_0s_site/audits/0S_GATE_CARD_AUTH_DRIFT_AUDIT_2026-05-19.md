# 0S Gate Card Auth Drift Audit

Date: 2026-05-19
Target: `metraiyux_0s_site`
Purpose: find 0S-mounted apps that still ask for standalone Kaixu/provider/API/admin tokens instead of inheriting the 0S/FS27/SkyGate session and populated gate cards.

## Wiring Standard

If an app is mounted inside the 0S and the gate, the first question should be:

> Is the user already signed into the actual 0S/FS27/SkyGate session?

It should not ask a signed-in user to pick, paste, request, or create a separate Kaixu key. Gate cards, usage lanes, app entitlements, and operator/admin scope should flow from one 0S session object into the mounted app.

## Scan Scope

Static/source scan covered the 0S launcher app registry, mounted Free99 apps, Marketing Made Easy apps, live apps, admin/operator rooms, SkyeMail, ConnectLog/Relay13, SkyeProfitConsole, SkyeSplitEngine, SkyeMusicNexus, SkyeMediaCenter, Skye Content Forge, and related gate/session helpers.

Primary patterns scanned:

- `Kaixu Key`, `KAIXU_VIRTUAL_KEY`, `Kaixu Gateway sub-key`, `kAIxU key`
- `OpenAI API Key`, `Gemini API Key`, `SKYE_ADMIN_KEY`, `PLATFORM_ADMIN_TOKEN`
- `Paste 0S / FS27 session token`, `Paste SkyeGateFS27 bearer token`, `Operator API key`, `Operator Token`
- `kaixu_api_key`, `kx.api.accessToken`, standalone token issue/unlock helpers

## Direct Kaixu Or Provider Key Prompts

These are the highest-priority offenders because they directly contradict the 0S/gate expectation.

| App | Evidence | Problem |
|---|---|---|
| skAIxU Code Evaluator | `Free99/apps/skaixu-code-evaluator/app.html:348`, `:1602`, `:1888`, `:4022`, `:4313` | User must paste `Kaixu Key (KAIXU_VIRTUAL_KEY)`. Analysis and patch actions are disabled unless `getKaixuKey()` returns a browser-stored key. |
| kAIxU CodeStudio App | `Free99/apps/kaixu-codestudio/app/app.js:739`, `:1404`, `:3145` | Vault setup asks for `Kaixu Gateway sub-key`, then AI calls use `Authorization: Bearer ` plus `state.vaultSecret`. |
| Documorph App | `Free99/apps/documorph/app/index.html:900`, `:917`, `:924` | App exposes `Local Key` mode and asks for Gemini/OpenAI API keys in the browser. |
| kAIxU BrandKit | `Marketing-Made-Easy/kAIxUBrandKit/app.html:458` | UI maps 401 to `Invalid or missing kAIxU key... Check your virtual key`, so the user-facing failure mode is still "key missing" instead of "0S session not active or not entitled." |
| SkyeVaultPro Founder | `Free99/apps/skyevaultpro/founder/index.html:1568` | Public CTA sends the user to request a kAIxU API key. Inside 0S this should route to gate entitlement or app card activation, not an external key request. |

## Standalone Token Control Planes

These are not all Kaixu-specific, but they have the same architectural problem: they maintain their own auth/key ceremony instead of inheriting the 0S gate card.

| App / Surface | Evidence | Problem |
|---|---|---|
| SkyeAPI + AegisCore Console | `Free99/apps/skyeapi-aegiscore/apps/console/index.html:26`, `:34`, `:44`, `:56`, `:64` | Console asks for gateway URL, admin key, scoped SkyeAPI key, and provider env bundles. It is behind Free99 gate but still runs its own key model. |
| SkyeDocxMax / SovereignDocs shared auth | `Marketing-Made-Easy/SkyeDocxMax/_shared/auth-unlock.js:2`, `:4`, `:70`, `:84`, `:137`; mirrored under `Free99/apps/sovereigndocs/skye-docx-max/app/_shared/` | Uses `kx.api.accessToken` / `kaixu_api_key`, `/api/token-issue`, `/api/auth-pin-unlock`, and bearer headers rather than a 0S gate-card adapter. |
| ConnectLog Relay13 bridge | `connectlog-v7.7-relay13-operator-proof/app.html:252`, `:256` | Setup asks for Relay13 origin/workspace plus optional operator API key stored in browser. |
| Relay13 Admin | `relay13-core-v1.7-connectlog-operator-proof/public/admin/index.html:51`, `:61` | Admin asks for `PLATFORM_ADMIN_TOKEN` and creates scoped API keys separately. |
| NorthStar Provisioner | `northstar/assets/app.js:666`, `:678` | Workspace provisioning asks for `OPERATOR_PROVISION_TOKEN`. |
| SkyeMerit Admin | `operator/skyemerit-admin.html:36` | Operator pack issuer asks for a raw `0S admin bearer token`. |
| SkyeMail login | `live/SkyeMail/login.html:354`, `:399` | Login screen asks for FS27 bearer token manually instead of consuming the existing 0S/FS27 session. Same duplicate exists in `live/SkyeMail/cf-assets/login.html`. |
| Staffing login | `live/sol_staffing_agency_site/staffing-login.html:37` | Staffing session creation asks for a pasted Skyegate FS27 bearer/session token. |

## Gate Token Fallback Screens

These apps are closer to the right idea because they do require the gate, but they still show manual token inputs when they cannot find a session. The drift is that they read scattered storage keys and do not consume the admin bridge session or a canonical 0S gate-card object.

| App / Helper | Evidence | Problem |
|---|---|---|
| Generic Free99 gate | `Free99/free99-gate.js:46`, `:51`, `:53`, `:186` | Reads several legacy/session keys, but not `adminBrainToken` or `adminSecuritySession`. Shows `paste gate session token` across every Free99 app that includes it. |
| Free99 apps using the generic gate | `ae-flowpro`, `brandid-offline-pwa`, `businesslaunchgo`, `doctor-ops-personal-vault`, `documorph`, `kaixu-brandkit`, `kaixu-codestudio`, `kaixu-storefront`, `skaixu-code-evaluator`, `skyeapi-aegiscore`, `skyearcade`, `skyebox-authenticator`, `skyeopsconsole`, `skyevaultpro`, `sovereigndocs` | These are all subject to the generic manual gate-token fallback if the shared 0S session is not already mirrored into one of the expected local/session storage keys. |
| SkyeProfitConsole | `SkyeProfitConsole/gate-session.js:153`, `:158`, `:162` | Manual `Paste 0S / FS27 session token` fallback and separate `Use 0S Client Session` button. |
| SkyeSplitEngine | `SkyeSplitEngine/gate-session.js:282`, `:287`, `:291` | Same manual token fallback. |
| SkyeMusicNexus | `SkyeMusicNexus/gate-session.js:204`, `:207`, `:211` | Same manual token fallback. |
| SkyeMediaCenter | `SkyeMediaCenter/gate-session.js:320`, `:322`, `:327`, `:328` | Same manual token fallback plus separate operator/proof/session buttons. |
| Skye Content Forge / Repurposer | `skye-content-repurposer-local/public/gate-session.js:287`, `:292`, `:296` | Same manual token fallback. |

## Root Cause

The repo has multiple valid session concepts, but no single canonical browser bridge that every mounted app consumes:

- Admin OS stores `adminBrainToken` and `adminSecuritySession` in `admin/skygate-auth-bridge.js`.
- SaaS/client login stores `saas_client_session`.
- Free99 and app-specific gate helpers look for different local/session storage keys.
- Older imported apps use `kaixu_api_key`, `kx.api.accessToken`, `KAIXU_VIRTUAL_KEY`, or app-specific API/admin tokens.
- Some server-side env keys are legitimate infrastructure secrets, but several app UIs still expose the old standalone key mental model.

## Required Repair Pattern

1. Add one canonical 0S gate-card bridge that normalizes admin, client, FS27, SkyGate, and SaaS sessions into one browser object, for example `window.METRAIYUX_0S_SESSION` plus `METRAIYUX_GATE_SESSION`.
2. Have the 0S launcher inject or mirror that session into wrapped iframes/windows before the app boots.
3. Update `Free99/free99-gate.js` and every app-specific `gate-session.js` to consume the canonical bridge before showing any manual token UI.
4. Replace Kaixu/provider key prompts with `0S session required` or `app not entitled/configured` states. The UI should call the 0S/Worker adapter, and the Worker should own Kaixu/provider secrets.
5. Keep local/dev-only unlocks clearly limited to localhost proof, not production UX.

## Suggested Repair Order

1. Fix `skAIxU Code Evaluator` and `kAIxU CodeStudio` first because they are directly asking for Kaixu keys.
2. Fix `Documorph` local-key mode and `kAIxU BrandKit` key-missing error copy so AI is always routed through a gate-backed server lane.
3. Patch `Free99/free99-gate.js`; this will remove the same fallback problem from 15 mounted app families at once.
4. Patch app-specific gate helpers for Profit, Split, Music, Media, and Content Forge.
5. Replace standalone admin/operator token screens in SkyeAPI, Relay13, NorthStar, SkyeMerit, SkyeMail, and Staffing with 0S gate-card/admin-scope checks.

## Repair Pass - 2026-05-20

Status: core rewire completed for the highest-risk surfaces and shared gates.

What changed:

- Added `assets/js/0s-gate-card-bridge.js` as the canonical browser bridge for 0S/SkyGate sessions, gate cards, auth headers, and browser-local event telemetry.
- Mounted the bridge in the 0S launcher and rewired the launcher `gate` app to `skyegate/index.html`.
- Moved the gate source into `skyegate/source/SkyeGateFS27/` so the repo has one gate source home inside 0S. The moved source includes the former root dependency folder; verified size is 52M with 420 source files excluding `node_modules` and 5,171 files including it.
- Added `skyegate/index.html`, `skyegate/gate-platform.js`, `skyegate/SKYGATE_0S_MIRROR_MANIFEST.json`, and `0s/0s-cohesion-manifest.json`.
- Patched `admin/skygate-auth-bridge.js`, `admin/0meg4kai-security.js`, and `admin/skyerunners.html` so admin auth, 0meg4kAI scans, and SkyeRunner actions attach gate-card context and bridge events.
- Patched `Free99/free99-gate.js` plus SkyeProfitConsole, SkyeSplitEngine, SkyeMusicNexus, SkyeMediaCenter, and Skye Content Forge gate helpers to consume the 0S bridge/canonical storage before any fallback screen.
- Patched direct key offenders: skAIxU Code Evaluator, kAIxU CodeStudio, Documorph, kAIxU BrandKit, and SkyeVaultPro Founder.
- Patched standalone operator-token screens: NorthStar provisioning, Relay13 Console, ConnectLog Relay13 bridge, SkyeMerit Admin, SkyeMail login copies, and Staffing login.

Verification:

- `node --check` passed for the new bridge, new gate platform script, patched gate helpers, patched admin/runner scripts, NorthStar, Relay13 Console, ConnectLog, Staffing login, and CodeStudio.
- Focused source scan across the rewired app folders returned no remaining UI/source hits for the blocked prompts: `Kaixu Key`, `KAIXU_VIRTUAL_KEY`, `Kaixu Gateway sub-key`, `Gemini API Key`, `OpenAI API Key`, `Invalid or missing kAIxU key`, `Request kAIxU API Key`, `OPERATOR_PROVISION_TOKEN`, `PLATFORM_ADMIN_TOKEN`, `Operator API key`, `FS27 bearer token`, and manual paste-token prompts. Generated proof/smoke folders and backend secret/env implementation files were excluded from the UI prompt scan.

## Deep Repair Pass - 2026-05-20

Status: remaining standalone auth brains rewired.

What changed:

- SkyeGate is now singular under `metraiyux_0s_site/skyegate/source/SkyeGateFS27/`; the repo-root `SkyeGateFS27` folder was moved into 0S instead of kept as a second runnable gate source. An old `about to delete/SkyeGateFS27` dependency-only duplicate was also removed after verifying it had zero non-`node_modules` source files.
- `assets/js/0s-gate-card-bridge.js` now emits explicit gate-card headers (`x-0s-gate-cards` / `x-skye-gate-cards`) so backend adapters can receive gate-card context, not only a bearer.
- SkyeAPI Console no longer asks for or stores browser admin/scoped keys. It loads the bridge, uses 0S/SkyGate headers for admin and capability calls, suppresses key-shaped response values in the result console, and records gate entitlement events.
- SkyeAPI Worker now accepts active 0S/SkyGate gate-card context for admin routes and `/v1/capabilities` / `/v1/call` without requiring a browser-held SkyeAPI key. Backend `SKYE_ADMIN_KEY` remains backend-only compatibility; it is no longer a console prompt.
- SkyeDocxMax and SovereignDocs shared auth modules were converted from local token issue/unlock helpers to 0S/SkyGate bridge adapters. The old `kx.api.accessToken`, `kaixu_api_key`, `/api/token-issue`, `/api/auth-pin-unlock`, `/api/auth-login`, and `/api/auth-signup` paths were removed from the shared runtime.
- SkyeDocxMax editor and SovereignDocs app now load the 0S gate bridge, attach gate headers to document AI/suite calls, and use gate-backed session metadata instead of minting fake standalone document sessions.

Verification added in this pass:

- `node --check` passed for the SkyeAPI console script, 0S gate bridge, SkyeDocxMax shared auth modules, and SovereignDocs shared auth modules.
- JSON validation passed for `skyegate/SKYGATE_0S_MIRROR_MANIFEST.json`.
- Focused source scan returned no remaining hits for the blocked browser-auth prompts and old token routes across the repaired app surfaces.
- SkyeAPI package typecheck could not be completed because both the full workspace install and narrowed gateway-worker install failed on registry socket timeouts while downloading packages such as `playwright-core` and `@neondatabase/serverless`. The partial failed install artifact was removed.

## Production Push - 2026-05-20

Status: pushed to live Workers and verified by HTTP checks.

What changed after the deep pass:

- Root `package.json` gate scripts now point to `metraiyux_0s_site/skyegate/source/SkyeGateFS27/`; no root `SkyeGateFS27` script path remains.
- The 0S bridge no longer accepts old `kx.api.accessToken`, `kaixu_api_key`, or `KAIXU_VIRTUAL_KEY` local-storage aliases. Apps must inherit an actual 0S/SkyGate session.
- The bridge now forwards role, email, customer, workspace, and client headers in addition to gate-card headers.
- FS27 push/GitHub Netlify functions now resolve the shared 0S/SkyGate session through `requireGateAuth()` instead of directly requiring browser-held Kaixu keys.
- FS27 CORS now allows the 0S/SkyGate gate-card/session headers.
- SkyeMail login no longer exposes a manual gate-token fallback field; it continues with the inherited 0S/SkyGate session.

Production deployments:

- `metraiyux-0s-full-system` deployed to `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/` at version `bf22ef72-397b-462f-b3ee-8bb4c6d1d112`.
- `skyegatefs27-citadeldb` deployed to `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/` at version `f7d69577-a0a4-40e5-b8a2-30c6db2269d3`.
- `skyemail-platform` deployed to `https://skyemail-platform.graylondonskyes.workers.dev/` at version `6b28eec4-1012-4e46-bb42-fcc61abfbc20`.

Live verification:

- 0S root returned HTTP `200`.
- 0S SkyGate page returned the updated `Single Gate Source` / `canonical 0S gate source` copy.
- Live 0S bridge returns `x-0s-gate-cards`, `x-0s-role`, and `x-0s-customer-id`; the old Kaixu local-storage aliases were absent in the live bridge response.
- Live FS27 `assets/user.js` now says admin actions require an admin `0S/SkyGate session`.
- Live SkyeMail `/login` returned HTTP `200` and shows `Continue with 0S/SkyGate` with no `fs27Token` input.
