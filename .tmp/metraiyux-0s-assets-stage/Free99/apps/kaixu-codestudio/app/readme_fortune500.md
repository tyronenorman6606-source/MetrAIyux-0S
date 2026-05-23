# kAIxu CodeStudio Pro — Platform PWA Pack

This folder is the browser client for **kAIxu CodeStudio Pro**. It is still safe to drop-deploy as a static PWA, but the full package now also includes `/server` for executable workflow/provider operations.

## Build identity

- Version: 5.9.0
- Schema: codestudio-v5
- Build ID: platform590-20260510
- Built at: 2026-05-10T22:20:00Z

## Client security posture

- Strict CSP on the main app: no inline scripts, no inline styles, no eval/new Function.
- Kaixu Gateway-only AI routing from the browser assistant.
- Encrypted secrets at rest using AES-256-GCM via WebCrypto.
- Optional workspace encryption at rest.
- Sandboxed JS runner in `/sandbox/host.html` with network blocked.
- Sanitized HTML preview by default.
- Platform Console with provider packs, policy rules, workflows, webhook inbox, upstream-claim intake, release gates, and backend bridge.

## Executable backend bridge

Run from the package root:

```bash
npm run platform:server
```

Then open the app, click `Platform`, set backend base to `http://localhost:7137`, and use backend health/smoke/workflow actions.

## Local proof

From the package root:

```bash
npm run smoke:fixture
```

The smoke test exercises real HTTP routes and backend adapter chains in fixture mode, then writes proof artifacts under `/platform/proof`.

## Static deploy note

Deploying only `/app` gives the offline-first workspace and UI. Executable workflow runs require the `/server` backend or an equivalent worker deployment using the included routes/manifests.
