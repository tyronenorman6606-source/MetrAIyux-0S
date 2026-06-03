# SkyeNet Public Posting And Pricing Guide

Last updated: 2026-05-28

This is the general guide for posting a normal site, landing page, PWA, or static app to SkyeNet.

## Live Links

- SkyeNet home: `https://skyenet.graylondonskyes.workers.dev/`
- Public posting guide: `https://skyenet.graylondonskyes.workers.dev/publish/`
- Pricing anchor: `https://skyenet.graylondonskyes.workers.dev/publish/#pricing`
- Standalone console: `https://skyenet.graylondonskyes.workers.dev/console`
- Source transfer API: `https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-transfer`
- Shared 0S gate: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html`
- Health check: `https://skyenet.graylondonskyes.workers.dev/health`
- Reference client app: `https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/`
- Reference client workspace: `https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/workspace-preview/`

## What People Can Post Today

SkyeNet is ready for:

- Static sites and landing pages.
- Built frontend apps with a root `index.html`.
- PWA shells with manifests and service workers.
- Public or shared-gate-protected routes.
- Client-facing media inside the plan bundle cap.
- Deployment receipts, route records, dashboard state, gated full project source package download, env-variable registry, and stored source-transfer receipts.
- Owner-approved managed JS/ESM function bundles with CLI bundling, server-signed activation, and Dynamic Worker invocation.
- Netlify-style Forms capture with multipart private file custody, owner inbox APIs, moderation, policy spam controls, private file download, and receipt-only notification records.

Do not sell as ready yet:

- Unlimited Free99 hosting.
- Unlimited hostile-code serverless execution, scheduled/background functions, or native dependency builds.
- External Forms email/SMS delivery without an owner-approved provider integration; current Forms notifications are stored receipt records.
- Raw private-server claims without the SkyeNet Sovereign Runtime proof lane.
- Full repo download from SkyeNet unless the project was intentionally uploaded through the private `--source-root` source package lane.

## Normal Browser Posting Flow

1. Open `https://skyenet.graylondonskyes.workers.dev/console`.
2. Sign in with the shared 0S/FS27/SkyGate/Free99 gate. SkyeNet does not have a second deployer password.
3. Create or resume a workspace.
4. Choose the plan.
5. In Publish package, choose the public build folder.
6. Choose the private full source folder when the customer or owner should be able to recover the complete project later. Secret-like files, `.env` files, `.git`, `node_modules`, and local database files are filtered before upload.
7. SkyeNet requires a root `index.html` before the deployment can complete. Common roots like `dist`, `build`, `out`, and `public` are promoted automatically.
8. Register the public company route on a platform-native SkyeNet hostname:

```text
https://skyenet.<company-slug>/
```

The shared `https://skyenet.graylondonskyes.workers.dev/<project-slug>/` path route is infrastructure, fallback, proof, or temporary staging unless the owner explicitly approves it as public copy.

9. Save the deployment ID, route receipt, console link, and founder-only source custody details in Founder Command.

## CLI Posting Flow

Use this when an operator or agent is deploying from the repo:

```bash
export SKYENET_AUTH="<shared gate bearer>"

npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --source-root <full-project-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.<company-slug> \
  --mount / \
  --url-mode subdomain \
  --public \
  --functions \
  --concurrency 4
```

For a private route, omit `--public`:

```bash
npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --source-root <full-project-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.<company-slug> \
  --mount / \
  --url-mode subdomain \
  --concurrency 4
```

## Current Plan Caps And Offer Structure

These caps are live in the SkyeNet deploy API. The paid offer amounts exist in `metraiyux_0s_site/skyenet/PLATFORM_TRUTH.json` and are the current owner-review offer structure. Treat the public sales copy as draft until the owner does a fresh billing/provider review.

| Plan | Current price posture | Bundle cap | Deployments | Public routes | Custom domains | Functions | Retention |
| --- | --- | ---: | ---: | ---: | ---: | --- | ---: |
| Free99 | `$0`, capped demo/workspace lane | 25 MB | 3/mo | 1 | 0 | No | 30 days |
| SkyeNet Edge Starter | `$297` setup + `$97/mo` | 25 MB | 20/mo | 1 | 0 | No | 60 days |
| SkyeNet Edge Growth | `$997` setup + `$297/mo` | 150 MB | 100/mo | 5 | 1 | Managed review | 120 days |
| SkyeNet Functions Managed | `$1,500` setup + `$497/mo` | 250 MB | 150/mo | 8 | 2 | Approved managed | 180 days |
| SkyeNet Sovereign Runtime Reserve | `$5,000` setup + `$997/mo` | 500 MB | 300/mo | 20 | 5 | Isolated runtime reserved | 365 days |

Free99 recommended guardrails also include a tiny public demo posture, no custom domains, no arbitrary functions, 30-day retention, and roughly 10,000 monthly requests per workspace until owner-approved.

## What To Tell A Customer

Use plain language:

```text
I can publish your landing page or app on SkyeNet, our deploy network. Public company surfaces get a platform-native SkyeNet hostname, workspace receipts, and account-scoped source bundle recovery through the shared gate. Free99 exists for small capped demos. Paid plans add more deployments, routes, retention, domains, and managed operations.
```

Avoid:

```text
Unlimited hosting, unlimited functions, or full private-server replacement for every workload.
```

## Source Custody, Download, And Transfer

Authenticated users can recover their own account-scoped deployed bundle:

```text
https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-download?workspace_id=<workspace>&project_id=<project>&deployment_id=<deployment>
```

This returns the private full project source package when the deployment was published with `--source-root`. If no private package was uploaded, it falls back to the public deployed files. Public app routes never serve the private source package.

SkyeNet env variables are managed through the shared gate:

```text
GET/POST/DELETE https://skyenet.graylondonskyes.workers.dev/api/skyenet/env
```

The console shows redacted previews only. Store function secrets here before owner-approved managed backend functions are activated.

Source handoff is separate from source download:

```text
POST https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-transfer
```

Supported transfer methods are `download`, `instant-download-link`, `skyedrive`, `skyevault`, and `secure-skye-pack`.

The secure customer-facing pack extension is `.skye`, backed by the existing SkyeDocxMax `.skye` envelope naming and the stronger SkyeSecure v2 `SKYESEC2` source-pack lineage. The storage-backed methods return `status: "completed"` only after SkyeNet writes the archive or encrypted pack into private transfer storage. Client source access is not automatic. Cross-account handoff requires an explicit owner/admin transfer receipt.

Full details: `docs/SKYENET_SOURCE_CUSTODY_AND_TRANSFER.md`

## Proof Commands

Use the live HTTP proof when changing source custody, env-variable, or console usability behavior:

```bash
npm run skyenet:netlify-parity:proof
```

The proof publishes a small app to SkyeNet, uploads a private full project package, writes an env var, confirms the env value is redacted on readback, downloads the account-scoped source tar, and confirms the private source path is not served from the public app route.

Use the stress pass before calling a source-custody or console-publish change live:

```bash
npm run skyenet:netlify-parity:stress
```

The stress pass runs repeated real publishes with private source packages, env writes, source downloads, source-exposure checks, and concurrent public reads.

Use the source-transfer stress pass when changing Drive/Vault/`.skye` custody behavior:

```bash
npm run skyenet:source-transfer:stress
```

That pass creates a tiny live deployment, uploads a private source package, then repeats SkyeDrive, SkyeVault, and secure `.skye` storage-backed transfers and saves the receipt under `test-artifacts/skyenet-source-transfer-stress/`.

## Required Closeout

For every production SkyeNet posting:

1. Confirm the platform-native SkyeNet route returns `200`.
2. Confirm key assets return `200`.
3. Confirm the page contains client-facing copy, not dev notes or source-path commentary.
4. Confirm source-download is blocked without auth and works with the shared gate.
5. Confirm the source download contains the private source package when `--source-root` was used.
6. Confirm env variables save through `/api/skyenet/env` and list as redacted.
7. Confirm source-transfer writes real artifacts for SkyeDrive, SkyeVault, and secure `.skye` pack methods, records an authenticated receipt, and does not expose source to a different customer account without owner/admin transfer.
8. Save receipts under `test-artifacts/`.
9. Update Founder Command/client records, QR targets, flyers, sitemaps, and cross-links.
10. Leave browser verification to the owner unless explicitly re-enabled for the task.
