# FS27 / 0S Auth Contract

Updated: 2026-05-31

## Source Of Truth

FS27/SkyGate is the canonical auth source for the 0S. Every mounted 0S app, helper Worker, owner command surface, customer workspace, and operator API must derive access from a shared FS27 gate session.

Free99 is not a second login system. Free99 is a gate-owned plan, entitlement, usage tier, and onboarding lane inside FS27. A client can start on Free99, then buy higher access or AI/provider add-ons, but the identity remains the same gate account.

## Required Behavior

- Founder/admin access comes from the shared FS27 gate identity and founder entitlements.
- Client signup creates or reuses one FS27 gate account, then attaches Free99 and paid entitlements to that gate card.
- Mounted app owner/admin routes must call `requireGateAuth`, `requireOperatorAuth`, shared FS27 introspection, or a helper that does the same.
- Legacy local codes may only be exchange credentials into FS27. They are not final authorization.
- If FS27 origin/service binding is missing, protected owner/admin routes fail closed unless an explicit local development fallback is enabled.
- Tour/demo tokens stay scoped, temporary, and read-only; they must not become full 0S gate sessions.

## Forbidden Splits

- No app-specific founder password.
- No app-specific owner/admin password.
- No client admin password that bypasses FS27.
- No broad public GET/HEAD bypass for protected proxy APIs.
- No raw Free99/admin code accepted as authority without FS27 exchange/introspection.
- No owner lockout recovery path that is outside the FS27/SkyGate recovery lane.
- No `/api/founder-command/login` minting alias. Owner login minting belongs to `/api/owner/admin-login`.

## Founder Recovery / Backdoor Rule

Founder recovery is allowed and required, but it must land back inside FS27. Recovery codes, owner emergency unlocks, vault/operator recovery, and drive/vault backdoors must mint or reuse an audited FS27/SkyGate session with founder/operator scope. They must not become hidden per-app passwords, raw `ADMIN_TOKEN` lanes, or browser-stored owner tokens.

## Implementation Anchors

- Main Worker gate enforcement: `metraiyux_0s_site/cloudflare/worker.js`
- FS27 session helpers: `metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/sessions.js`
- FS27 authz helpers: `metraiyux_0s_site/skyegate/source/SkyeGateFS27/netlify/functions/_lib/authz.js`
- Guard script: `tools/0s-auth-spine-guard.mjs`
- Focused security tests: `metraiyux_0s_site/tests/worker-security-audit.test.mjs`

## Current Root Fixes

- Main Worker local shared-code fallback is disabled by default.
- `/api/site-operator/ledger` is now operator-gated.
- Protected proxy reads no longer bypass the 0S gate just because the method is GET/HEAD.
- Paid-lane proof mode no longer treats local shared-code fallback as owner proof.
- SkyeMail mounted handoff tests now prove FS27 bearer access, not local `ADMIN_TOKEN` access.
- The root browser gate bridge now reads only canonical shared FS27 session aliases and no longer treats URL parameters, `adminBrainToken`, `saas_client_session`, Free99 storage, or runtime globals as login authority.
- SkyeSplitEngine, SkyeProfitConsole, and Free99 app gates no longer expose manual token boxes, local admin codes, app-local session storage, or client-session fallbacks. SkyeRouteX tour tokens remain allowed only as scoped read-only demo tokens and are not persisted back into the shared gate session.
- Admin command pages, Company Knowledge, NorthStar workspace bridge, AE Flow, and SkyeWebCreator no longer read `adminBrainToken`, `adminSecuritySession`, `saas_client_session`, Free99 browser storage, or legacy founder-token aliases as browser auth. They use the shared FS27 gate bridge and accepted Worker exchange headers only.
- SkyeMail browser assets now consume the shared FS27 gate bridge instead of local `SMV_*`, Free99, admin, or SaaS token aliases. SkyeMail recovery export now requires an admin/operator FS27 session instead of `ADMIN_RECOVERY_TOKEN`.
- Owner login and public signup now persist only the canonical `METRAIYUX_GATE_SESSION`, `SKYGATEFS27_GATE_SESSION`, and `SKYE_GATE_SESSION` browser aliases. Old Free99/raw SkyGate/admin aliases are cleared instead of written.
- The SkyeRouteX public tour token stays in its own read-only tour storage and no longer overwrites any shared gate session key.
- Vantacore CRM, RouteX AE Command, SkyeContent, and SkyeSol/kAIxu admin bridge consume the shared gate bridge instead of URL tokens, local admin tokens, app-local client sessions, or kAIxu virtual admin tokens.
- SkyeNet deploy/proof tooling now uses `tools/lib/zero-os-gate-auth.mjs`, which accepts an existing shared bearer or exchanges owner root-env aliases only through `/api/owner/admin-login`.
- SkyeCommerce mounted customer auth no longer accepts local `skye_customer_session` cookies or customer password login/register as authority. Shared FS27 gate handoff still creates or reconciles compatibility customer rows, preserving existing customer/store data.
- SkyeVaultPro hosted profile and backup lanes no longer use Netlify Identity. Hosted sync uses the inherited FS27/Free99 gate session, and the Sovereign Backup add-on is checked as a gate entitlement/card instead of local browser storage.
- NorthStar/SigninPro browser command surfaces and imported Valley/NorthStar source copies no longer read or write local owner/admin token aliases for owner unlock. They use the shared gate bridge/session handoff.
- SkyeVault direct admin, diagnostics, setup, and operator routes preserve recovery access as FS27-bound operator sessions with read/write/download scope checks instead of raw token authority.
