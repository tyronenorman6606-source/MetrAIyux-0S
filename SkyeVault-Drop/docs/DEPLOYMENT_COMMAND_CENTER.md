# Deployment Command Center

Every serious app package should ship with an internal Deployment Command Center. This project includes it at `/setup.html`, but v1.9 protects that page behind `/operator.html` and Netlify Function session checks.

The page covers:

✅ Google Cloud project and Drive API setup.
✅ Service account and JSON key workflow.
✅ Config folder and destination folder checklist.
✅ Netlify environment variable generator.
✅ `GOOGLE_DRIVE_CONFIG_JSON` builder.
✅ Operator session, receipt signing, and client upload-code values.
✅ Optional webhook/email notification values.
✅ Copyable smoke/proof commands.
✅ Live diagnostics for env shape, Google auth, config folder access, and routing config.
✅ Browser proof checklist for small uploads, large-video uploads, receipt recovery, Drive health, and notification delivery.

This page is internal/operator-facing only. It must never be linked from the public client surface.


## v1.9 additions

✅ Generates abuse-control env vars for rate limits, portal-code lockout, and optional Turnstile.
✅ Generates client receipt email env vars.
✅ Includes Health Preflight and Maintenance Sweep in the operator proof path.
✅ Includes `npm run e2e:mock-browser` before live Drive proof.

## v2.0 Command Center requirements

Every future package should include the v2.0 command-center pattern:

- provider/key setup
- env generator
- folder/permission helper
- live diagnostics
- export center
- metadata backup button
- scheduled maintenance status
- notification test/replay
- scanner/review workflow setup
- live-smoke commands
- optional Playwright browser proof commands

## v2.2 repo snapshot addition

The Command Center now documents the repo snapshot lane for operators who need to preserve a whole source workspace in the vault. Use this after the normal R2 live proof passes:

```bash
npm run vault:dry-run
npm run vault:push
```

The source repo helper packages a sanitized zip, blocks obvious credential leaks, uploads through the deployed vault API, and writes a local receipt JSON. It is meant for controlled archive/handoff snapshots, not as a replacement for GitHub.
