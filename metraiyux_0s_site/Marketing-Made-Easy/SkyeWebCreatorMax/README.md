# SkyeWebCreatorMax

SkyeWebCreatorMax is the SkyeDocxMax-style standalone platform for website, UI, app-shell, and 3D web experience creation.

It is designed to work in two modes:

1. **Standalone mode** - runs as a local/offline-first PWA with browser persistence.
2. **Shared-gated connected mode** - sends project requests, generated artifacts, and client delivery handoffs through the 0S Worker at `/api/marketing-made-easy/webcreator-runtime/*`.

The extensionless files such as `health`, `status`, `queue`, `review-board`, `execution-board`, `dispatch-board`, `handoff-packs`, `v1/runtime-summary`, and `v1/sessions` are static route contracts. They are not live telemetry, customer visibility, live sessions, or downstream delivery proof. Live/current state must come from the shared FS27/SkyGate/Free99-gated Worker APIs.

## System Role

SkyeWebCreatorMax is the user-facing web creation surface for:

- landing pages
- SaaS dashboards
- app shells
- client websites
- 3D product showcases
- UI redesign briefs
- AE-ready delivery packages

It uses SkyDexia and the Design Vault as the design intelligence layer:

- `design-vault/library/use-case-matrix.json`
- `design-vault/library/templates/template-catalog.json`
- `design-vault/library/catalog/pattern-index.json`
- `design-vault/library/catalog/source-index.json`

## Connected Runtime

The production Worker runtime is:

```txt
/api/marketing-made-easy/webcreator-runtime/*
```

The older code-backed bridge for local/bus proof is:

```txt
skyehands_runtime_control/core/webcreator/skyewebcreator-bridge.mjs
```

It persists projects under:

```txt
skyehands_runtime_control/.skyequanta/webcreator
```

And publishes these platform-bus events:

- `webcreator.project.requested`
- `webcreator.project.generated`
- `webcreator.asset.persisted`
- `webcreator.delivery.queued`
- `ae.requested`
- `app.generated`

## Smoke

Run the bus-level proof:

```bash
cd skyehands_runtime_control
npm run smoke:skyewebcreator
```

Run the standalone package smoke:

```bash
node AbovetheSkye-Platforms/SkyeWebCreatorMax/smoke/smoke-release-checks.mjs
```
