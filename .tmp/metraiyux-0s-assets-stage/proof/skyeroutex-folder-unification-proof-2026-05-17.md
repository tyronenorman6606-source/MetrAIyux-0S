# SkyeRouteX Folder Unification Proof - 2026-05-17

## Canonical layout

SkyeRouteX is now the parent folder for the workforce route lane.

```text
metraiyux_0s_site/SkyeRouteX/
metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0/
```

The old top-level v0.4.0 path is retained only as a compatibility pointer:

```text
metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0 -> SkyeRouteX/workforce-command-v0.4.0
```

## Guardrail added

`npm run 0s:skyeroutex:proof` now starts with:

```bash
npm run 0s:skyeroutex:layout
```

That guard fails if the Workforce Command app is separated from `SkyeRouteX` or if the legacy top-level path becomes a real separate folder instead of a symlink.

## Proof run

The full chain passed on 2026-05-17 at 22:17:39 UTC:

```bash
npm run 0s:skyeroutex:proof
```

Passed coverage:

- `0s:skyeroutex:layout`: nested folder and legacy symlink verified.
- `0s:skyeroutex:runtime`: V83 runtime smoke passed 16/16.
- `0s:skyeroutex:v04`: v0.4.0 `smoke:all` passed, including browser panels, real Chromium click flow, provider/contractor assignment flow, storage/export, S3-compatible signing, integrations, manual compliance vault, webhooks, native provider contracts, provider callbacks, runtime bus, provider guards, security, integrity, audit chain, auth controls, admin invites, migrations, reset, deploy readiness, and SkyeHands mount.
- `0s:skyeroutex:e2e`: 0S home, RouteX hub, nested v0.4.0 hub, legacy compatibility URL, API UI, V83 shell controls, static endpoints, sales proof router, pricing, and desktop/mobile screenshots passed.

## Live env path proof

The nested v0.4.0 app now resolves the repo root env correctly:

```bash
cd metraiyux_0s_site/SkyeRouteX/workforce-command-v0.4.0
npm run check:prod:root-env
```

The check passed against:

```text
/workspaces/MetrAIyux-0S/.env
```

No required production categories were missing in that check.
