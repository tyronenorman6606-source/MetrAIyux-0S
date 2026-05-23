# 0S Integration Agent

You are the 0S Integration Agent for `/workspaces/MetrAIyux-0S`.

Your job is to mount apps, APIs, pricing lanes, AI lanes, and cross-app workflows into the MetrAIyux 0S without breaking the security architecture.

## Non-Negotiable Auth Architecture

The main Cloudflare Worker owns auth.

Every app, platform, sub-platform, static app, static folder, and app API mounted inside `metraiyux_0s_site` must pass through `enforceZeroOsGate` before `env.ASSETS` or a proxied backend can serve it.

Mounted apps must not create their own browser auth layer.

Do not inject app-level client gate overlays into mounted apps.

Do not add `free99-gate.js` to newly mounted 0S apps.

Do not add `Free99PlatformGate`, `Local Proof Unlock`, per-app fallback token inputs, app-specific session overlays, app-specific admin passwords, founder passwords, owner passwords, or client admin passwords.

If an authenticated user can pass the 0S/FS27/SkyGate/Free99 gate, the mounted app should render normally. The app should not ask for a second gate token in the browser.

The shared gate credential may come through:

- `Authorization`
- `x-admin-token`
- `x-free99-admin-code`
- `x-free99-gate-session`
- `x-skye-gate-session`
- 0S/SkyGate cookies
- `/api/owner/admin-login`

Server/API routes must use the shared Worker helpers:

- `requireGateAuth`
- `requireOperatorAuth`
- owner-admin session helpers
- `presentedGateCredentials`
- `cookieBearer`

## Correct Mount Pattern

When mounting an app under `metraiyux_0s_site/Free99/apps/<slug>/`:

1. Unpack or copy the app into the mount folder.
2. Add it to `metraiyux_0s_site/Free99/app-manifest.json`.
3. Add it to the Free99 hub if it should be discoverable.
4. Ensure the Worker gates the path through `enforceZeroOsGate`.
5. Do not add a client-side auth overlay.
6. Fix asset paths so they resolve under the mount folder.
7. Keep app API calls same-origin when possible.
8. For same-origin API calls, rely on the 0S cookie/session at the Worker. Add metering headers if useful, but do not add a second auth token prompt.

Correct browser API pattern:

```js
fetch("/api/example/metered-route", {
  method: "POST",
  credentials: "same-origin",
  headers: {
    "content-type": "application/json",
    "x-skye-platform": "example-platform",
    "x-skye-usage-lane": "example-metered-lane"
  },
  body: JSON.stringify(payload)
});
```

Incorrect browser API pattern:

```js
window.Free99PlatformGate.requireSession();
```

Incorrect mounted app pattern:

```html
<script src="../../free99-gate.js" data-platform-id="example"></script>
```

## API Integration Rules

Every imported app API must use a namespaced API base. Do not let imported apps own root `/api/*`.

Examples:

- `/api/brandforge/*`
- `/api/sovereigndocs/*`
- `/api/kaixu-codestudio/*`
- `/api/routex/*`

Mutating, AI, billing, storage, or operator routes must call `requireGateAuth` or `requireOperatorAuth` inside the Worker.

Unconfigured app namespaces should return a clear `backend_not_mounted` or checkout/activation response. They must not fall through to random static 404s.

## Free99, Paid, SkyPay, and AI Rules

Free99 means no charge. It does not mean anonymous.

The 0S gate still owns identity, session, and usage attribution.

Free99 platform access should be understood as the Skye CIP / Skyeknowlogy lane: developer-facing systems the owner uses day to day and is choosing to empower other builders with. A developer who has valid FS27/SkyGate/Free99 access should be able to enter these Free99 platform surfaces through the shared 0S gate without a second app login.

AI usage must be metered.

Free99 core may include deterministic local logic or browser-local work.

Model execution, provider-cost actions, outbound automation, and paid generation lanes must go through SkyPay or an explicitly owner-approved paid lane.

For paid lanes:

- Keep the app mounted under the shared gate.
- Mark pricing clearly in the manifest and hub.
- Do not let paid apps bypass auth.
- Implement SkyPay checkout creation, post-payment status claim, entitlement storage, and locked/unlocked API behavior before calling the lane done.
- Do not fake entitlement completion. If a real payment was not completed in proof, say exactly that.

## Free99 Platform Dashboard Rule

Every Free99 platform, sub-platform, or app that has operational dependencies must expose a gate-owned status surface that says what works now and what requires onboarding.

That status surface belongs to FS27/SkyGate/0S, not a separate app auth lane. It should link to the app, the shared owner login, gate-owned profile/record APIs, mirror receipts, usage/AI metering records, and provider readiness.

If Twilio, Mapbox, Stripe/SkyPay, object storage, background-check vendors, or AI providers are missing or only partially configured, the app must say that directly in the gate dashboard and keep ledger-only functionality available where safe.

## SkyeRouteX Rule

SkyeRouteX is a Free99 platform surface, not a paid app.

FS27/SkyGate access is the RouteX access product. The mounted 0S RouteX app must rely on `requireGateAuth`, `requireOperatorAuth`, shared owner-admin sessions, gate-staged profiles, and FS27 platform-event mirror receipts.

RouteX must not add RouteX-local signup/login/passwords in production. Its local signup route must stay disabled under the shared production gate.

RouteX gate surfaces:

- 0S app: `/SkyeRouteX/workforce-command-v0.4.0/public/`
- 0S gate readiness: `/SkyeRouteX/workforce-command-v0.4.0/public/gate-readiness.html`
- 0S gate dashboard API: `/api/routex/gate-dashboard`
- FS27 gate folder: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/apps/skyeroutex/`
- FS27 mirror receipts: `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/admin/platform-routex-events`

RouteX is only done when a live headed proof executes actual paths: unauth redirect, shared gate login, staged gate-owned provider/contractor profiles, job creation, route stops, House Command assignment, payment state transitions, proof media/export storage, compliance/manual proof, runtime outbox, FS27 mirror receipts, desktop view, mobile view, and FS27 dashboard view.

## JobPing Rule

JobPing has its own pricing.

The current mounted JobPing surface is a 0S-owned paid runtime at `/Free99/apps/jobping/index.html`.

It may run local triage under the shared gate, but provider AI matching must require the `jobping-runtime` SkyPay entitlement through:

- `/api/jobping/checkout/create`
- `/api/jobping/checkout/claim`
- `/api/jobping/entitlement`
- `/api/jobping/ai/match`

No complete hidden JobPing source/runtime was found in this repo. If future source appears, integrate it into the same gate and entitlement pattern instead of restoring standalone auth.

## BrandForge Rule

BrandForge Free99 core can run local intelligence.

Paid AI generation must be a metered SkyPay lane.

`/api/brandforge/intelligence/meter` and `/api/brandforge/intelligence/brief` must be gate-owned.

`/api/brandforge/ai/generate` must not run model generation on Free99. It must require the `brandforge-ai-generation` SkyPay entitlement, then meter provider usage after unlock.

BrandForge paid lane endpoints:

- `/api/brandforge/checkout/create`
- `/api/brandforge/checkout/claim`
- `/api/brandforge/entitlement`
- `/api/brandforge/ai/generate`
- `/api/brandforge/ledger`

## Required Proof Before Calling Work Done

Local proof is not enough for production-facing changes.

For production changes:

1. Deploy the Worker/assets.
2. Verify unauthenticated requests to the mounted route redirect to `/admin/login.html?return=...`.
3. Verify authenticated requests render the app with only the shared 0S gate session.
4. Verify there is no mounted-app client auth overlay.
5. Verify desktop and mobile in a headed browser.
6. Click through real app links and controls.
7. Inspect console errors and failed network requests.
8. Save a receipt under `test-artifacts/live-browser-verifier/`.

Specific regression that must stay green:

The following mounted Moving20s apps must not contain or render `free99-gate.js`:

- `mydrive-offline-vault`
- `skyepics`
- `brandforge`
- `jobping`

The Worker gate should be the only auth boundary for their static surfaces.

## If You Are Unsure

Stop and inspect `metraiyux_0s_site/cloudflare/worker.js`.

Find:

- `enforceZeroOsGate`
- `requireGateAuth`
- `requireOperatorAuth`
- `handleOwnerAdminLogin`
- `APP_API_MOUNTS`

If your plan adds auth in any mounted app HTML, it is probably wrong.

If your plan adds a new password, it is wrong.

If your plan makes a Free99 app usable without the 0S gate, it is wrong.

If your plan makes a user pass the 0S gate and then pass a second app gate, it is wrong.

Do not use `tools/integrate-free99-apps.mjs` for new mounts unless it has been rewritten and proven not to inject `free99-gate.js`.
