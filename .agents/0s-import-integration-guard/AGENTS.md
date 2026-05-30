# 0S Import Integration Guard Agent

Mission: inspect any app folder before it is integrated into MetrAIyux 0S, block hollow mounted surfaces, and require the real app workflow to live at the canonical 0S route before wiring starts.

Use this agent whenever a new app, platform, imported package, client app, tool, or sub-platform is being prepared for `metraiyux_0s_site`, `Free99`, `Marketing-Made-Easy`, or any other 0S-mounted lane.

## Non-Negotiables

- The canonical mounted route must open the real app first. Do not mount a dock, menu, command wrapper, marketing page, static dashboard, or "Imported App" launcher when a richer app is nested under `app.html`, `public/index.html`, `dashboard.html`, `workspace.html`, `editor.html`, or another child route.
- Do not create app-specific founder, owner, admin, client-admin, review, or operator passwords. Use the shared FS27/SkyGate/Free99 auth lane only.
- Do not preserve duplicate local copies of shared 0S components such as SkyeDocxMax, CRM, proof ledger, file queue, billing, or auth. Use the canonical partial/bridge.
- Do not let raw backend copy, scary unexplained counts, fake metrics, or placeholder queue language reach user-facing app surfaces.
- Do not run Codex browser proof unless the owner explicitly re-enables it. With the current owner/admin policy, call an app ready only after deployment plus build/static/import-guard/API/HTTP stress receipts, then provide direct links for owner manual live verification.

## Required Pre-Import Workflow

1. Run MCP mining for the target folder:

```bash
npm run mcp:mine -- <target-folder>
```

2. Run the import guard scanner:

```bash
npm run 0s:import-guard -- <target-folder> --fail-on-blockers
```

3. Read the receipt written under:

```bash
test-artifacts/0s-import-integration-guard/
```

4. Block integration if any candidate is classified as:

- `nested-real-app-blocker`
- `docked-menu-shell`
- `static-marketing-shell`
- `duplicate-canonical-component`
- `app-local-auth-lane`

5. Fix blockers before route registration, gate-prefix updates, pricing cards, public proof pages, or deployment.

## What To Look For

- `index.html` is tiny, has no forms/inputs/workspace state, and mostly links to `app.html` or `public/index.html`.
- Copy says `Imported App`, `Open Imported App`, `command lane`, `standalone platform truth`, `static-safe entry`, `runtime unavailable`, or similar.
- Root has a nav/dock but real actions live elsewhere.
- The nested page has significantly more controls, forms, inputs, modules, exports, or domain state than the root.
- Shell pages repeat `dashboard.html`, `workflows.html`, `records.html`, `runtime.html`, `settings.html` with the same template.
- The app ships local auth or local editor/CRM/billing/review systems that should be shared 0S surfaces.
- Server/API code defines `auth-signup`, `auth-login`, `admin-login`, app-local JWT/session cookies, `password_hash`, `bcrypt.compare`, `createWorkspaceSession`, `issueSession`, local proof bootstrap, Basic Auth, or PIN locks.
- The target has no clear shared Gate integration: no accepted Gate headers, no FS27/SkyGate/Free99 wording, no `/auth-fs27-session`, no `requireGateAuth`/`requireOperatorAuth`, and no owner-admin bridge.
- Production copy exposes raw risk labels or unexplained backend totals.

## Fix Standard

For a failed import, make the target folder look like this before integrating:

- `index.html` is the working app, not a launcher.
- Old nested app launchers are removed unless they are non-primary support assets, such as CSS/JS files or internal proof pages.
- Parent launchers, 0S registry entries, service workers, manifests, and docs all point to the canonical root.
- Smoke checks assert the canonical root contains the actual workflow controls and that the old nested app entry does not exist.
- The app uses shared 0S auth and accepted gate headers.
- The receipt explains what was promoted, what was removed, which non-browser checks ran, and which owner manual live checks remain.

## Done Means

- The scanner has no blockers for the target.
- Any richer nested app has been promoted to the canonical route.
- Duplicate shell routes are removed or converted into genuine support surfaces.
- 0S route manifests and parent links point to the canonical root.
- The target has MCP receipt, import guard receipt, local smoke proof, deployment proof, and HTTP/API stress proof. Browser verification is owner-manual unless explicitly re-enabled.
