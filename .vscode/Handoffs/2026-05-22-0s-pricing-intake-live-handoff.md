# 0S Pricing And Intake Router Live Handoff

Date written: 2026-05-22 UTC  
Production deploy date: 2026-05-21 UTC  
Production Worker: `metraiyux-0s-full-system`  
Live base: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev`  
Live Worker version proved: `7e1c2873-ba27-4425-909c-1b4456e9a2a2`

## Status

This work is live and browser-proved in production.

The new pricing/intake router is live at:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router.html
```

Cloudflare canonicalizes some `.html` URLs to extensionless routes, so the browser may land on:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/pricing-offer-router
```

That is expected and was accounted for in proof.

## What Changed

Created the gated sales/pricing router:

```text
metraiyux_0s_site/sales/pricing-offer-router.html
```

The router now consolidates the pricing surfaces that were scattered across the 0S gate:

- Approved 0S SaaS offers.
- Free99 no-charge/gated lanes.
- AI and kAIxU usage-pack boundaries.
- SkyeMusicNexus paid tiers and add-ons.
- Agentic Growth pricing.
- Gate/ecosystem pricing rows.
- Quote-only and pending-SKU surfaces.
- SkyePay checkout/store handoff links.

Looped the new router into these intake and signup surfaces:

- `metraiyux_0s_site/index.html`
- `metraiyux_0s_site/saas/index.html`
- `metraiyux_0s_site/saas/signup.html`
- `metraiyux_0s_site/Free99/index.html`
- `metraiyux_0s_site/clients/intake.html`
- `LIVE_URL_REGISTRY.md`
- `LIVE_DEPLOYMENT_LEDGER.md`
- `metraiyux_0s_site/brain/live-surface-registry.json`

Added/updated the machine-readable Free99 boundary:

```text
metraiyux_0s_site/data/free99-entitlements.json
```

## Pricing Boundary Now Expressed

Free99 means:

- Gated no-charge preview/access.
- Safe local app use.
- Local exports/proof receipts.
- Browser-local vault/media/campaign work where provider calls are not needed.

Free99 does not include:

- AI/model calls.
- kAIxU provider usage.
- Hosted custody/backup/recovery.
- External publishing/provider actions.
- Outbound sends.
- Payment or identity-provider actions.
- Route-provider actions.
- White-label resale or tenant resale.

Those cost-bearing lanes now route to paid plan scope, AI usage top-up, SkyePay entitlement, or owner-approved quote.

## Core 0S Paid Plans On The Router

The router carries these current app-facing 0S plan prices:

- Starter Command: `$397/mo + $1,500 setup`
- Growth Cabinet: `$997/mo + $3,500 setup`
- RouteX Workforce Command: `$1,497/mo + $6,500 setup`
- Autonomous Office: `$2,497/mo + $7,500 setup`
- Enterprise / Managed Gate: `$3,997/mo + $15,000 setup`

Enterprise / Managed Gate is the route for white-label/resale style platform use: branded tenant policy, custom domains, portal mirroring, dedicated policies, managed control plane, or selling access as their own platform.

## SkyePay Handling

SkyePay was linked but not repriced.

Important: this pass intentionally did not edit SkyePay pricing logic or the live SkyePay catalog. The router provides handoff links to SkyePay and the SkyePay store for approved offers. Any future SkyePay repricing should happen as a separate controlled pass.

## HouseOps / SkyeBox Handling

HouseOperations + SkyeBox is bundled inside the current 0S plan scope.

Standalone HouseOperations managed custody remains quote-only until a separate managed-security custody policy and live deployment proof exist. Do not add standalone HouseOps SkyePay checkout from signup, billing, SaaS pricing, or this router until that policy exists.

## Auth / Gate Handling

No app-specific passwords were added.

Everything remains under the shared FS27/SkyGate/Free99 auth lane owned by the main Worker. The live proof confirmed unauthenticated access to the pricing router redirects to:

```text
/admin/login.html?return=/sales/pricing-offer-router.html
```

Authenticated access renders normally after the shared owner gate is unlocked.

Tiny browser metadata route `/favicon-32.png` was also made public as allowed metadata, matching the repo gate policy for small browser assets. This fixed the only failed request from the first live proof attempt.

## Production Proof

Final passing live headed browser proof:

```text
test-artifacts/live-browser-verifier/pricing-intake-live-2026-05-21T19-25-29-838Z/live-headed-browser-pricing-intake-receipt.json
```

Proof summary:

- `ok: true`
- Worker version: `7e1c2873-ba27-4425-909c-1b4456e9a2a2`
- Started: `2026-05-21T19:25:29.838Z`
- Finished: `2026-05-21T19:31:13.696Z`
- Route runs: `10`
- Screenshots: `53`
- Console errors: `0`
- Failed requests: `0`
- Failures: `0`

Routes proved on desktop and mobile:

- `/sales/pricing-offer-router.html`
- `/saas/index.html`
- `/saas/signup.html`
- `/Free99/index.html`
- `/clients/intake.html`

Interactions proved:

- Shared gate login and return.
- Unauthenticated pricing-router redirect to the shared gate.
- Pricing router Start Signup link.
- Pricing router SaaS pricing link.
- SaaS hub Pricing Router link.
- SaaS hub Free99 Hub link.
- SaaS signup form fields.
- SaaS signup Pricing Router handoff.
- Free99 pricing-boundary link.
- Client intake form fill and local save.
- Client intake Pricing Router handoff.
- Full-page desktop and mobile scroll stops with visual nonblank checks.

## Validation Already Run

Static/runtime checks:

```text
node --check metraiyux_0s_site/cloudflare/worker.js
```

JSON parse checks passed for:

```text
metraiyux_0s_site/brain/live-surface-registry.json
metraiyux_0s_site/brain/sales-offer-registry.json
metraiyux_0s_site/data/free99-entitlements.json
metraiyux_0s_site/data/plans.json
```

Targeted stale-copy scan had no matches for:

```text
[object Object]
Only SkyeOpsConsole
AI Unlimited
unmetered paid AI
unlimited paid AI
```

Production metadata check:

```text
curl -I https://metraiyux-0s-full-system.graylondonskyes.workers.dev/favicon-32.png
```

Returned `200`.

## MCP Note

The required MCP post-change mining command was attempted, but the runner hung and did not produce an updated receipt after the latest link/registry/favicon changes. The last clean MCP receipt exists from before those final changes, but the final production proof is the source of truth for this handoff.

Do not treat this as a reason to undo the live work. It only means the MCP receipt should be regenerated later if you need the design-tooling audit trail refreshed.

## Files To Inspect First If Continuing

Primary surface:

```text
metraiyux_0s_site/sales/pricing-offer-router.html
```

Free99 boundary:

```text
metraiyux_0s_site/data/free99-entitlements.json
metraiyux_0s_site/Free99/index.html
```

Signup/intake loops:

```text
metraiyux_0s_site/index.html
metraiyux_0s_site/saas/index.html
metraiyux_0s_site/saas/signup.html
metraiyux_0s_site/clients/intake.html
```

Production gate/metadata patch:

```text
metraiyux_0s_site/cloudflare/worker.js
```

Registries:

```text
LIVE_URL_REGISTRY.md
LIVE_DEPLOYMENT_LEDGER.md
metraiyux_0s_site/brain/live-surface-registry.json
```

## Suggested Next Work

1. Regenerate the MCP tooling receipt for `metraiyux_0s_site` when the runner is behaving again.
2. Do a separate SkyePay pricing pass only if you want checkout catalog values changed.
3. Decide which quote-only Free99 paid-app imports deserve real SKU rebuilds.
4. Add more app-side enforcement against `data/free99-entitlements.json` where individual apps still only communicate the boundary in copy.
5. If white-label/resale is going to be actively sold, make a dedicated Enterprise / Managed Gate intake form that captures brand/domain/tenant-policy requirements before payment.

## Do Not Break These Rules

- Do not create app-specific admin/client passwords for mounted 0S apps.
- Do not let Free99 trigger AI/model/provider cost without a paid entitlement.
- Do not route white-label resale through normal Free99 access.
- Do not change SkyePay prices casually inside this router pass.
- Do not create standalone HouseOps managed-custody checkout until policy and proof exist.

