# SkyeNet Standalone Migration Directive

Last updated: 2026-05-28

Use this directive when an agent needs to move an existing SkyeNet deployment or route off the 0S `/skyenet/...` namespace and onto the real standalone SkyeNet deployment.

## Canonical Architecture

Shared SkyeNet Worker origin and platform console:

```text
https://skyenet.graylondonskyes.workers.dev
```

Canonical public company app route:

```text
https://skyenet.<company-slug>/
```

Examples:

```text
https://skyenet.skyeroutex-logistics/
https://skyenet.skyesol/
https://skyenet.solenterprises/
```

Shared-origin route for fallback, proof, or explicitly approved staging:

```text
https://skyenet.graylondonskyes.workers.dev/<project-slug>/
```

Shared-gate control APIs:

```text
https://skyenet.graylondonskyes.workers.dev/api/skyenet/*
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skyenet/*
```

Legacy/staging route only:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/<project-slug>/
```

Do not create SkyeNet-specific founder/admin/client passwords. SkyeNet deploy, account, dashboard, source download, and private route access must use the shared FS27/SkyGate/Free99 gate session.

## Migration Candidates Already Identified

These routes were previously deployed on the 0S SkyeNet path and should be migrated to standalone SkyeNet before the old 0S public content is removed:

| Surface | Current/legacy 0S route | Target platform-native route | Notes |
| --- | --- | --- | --- |
| SkyeRouteX Logistics | `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/skyeroutex-logistics/` | `https://skyenet.skyeroutex-logistics/` | Public company surface. |
| SkyeSol / Skyes Over London LC | `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/skyesol/` | `https://skyenet.skyesol/` | Public company surface. |
| SOLEnterprises | `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/solenterprises/` | `https://skyenet.solenterprises/` | Public umbrella company surface. |
| Founder Command | 0S private/gated SkyeNet record | Optional standalone private route | Keep private. Do not make public unless the owner explicitly says so. |
| Valley Verified | Existing Valley Verified/SkyeNet work in progress | Host-native SkyeNet URL if approved | Reconcile last because another agent is actively changing Valley Verified. |

Reference implementation:

```text
https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/
https://skyenet.graylondonskyes.workers.dev/bobs-smoke-shop/workspace-preview/
https://skyenet.graylondonskyes.workers.dev/console?workspace_id=bobs-smoke-shop
```

## Required Migration Flow

1. Inventory the old route, source folder, generated bundle, receipts, credentials record, QR/flyer targets, sitemap entries, and cross-links.
2. Archive the existing 0S route/source/surface to SkyeVault or SkyDrive before deleting, redirecting, or overwriting anything.
3. Save an archive receipt with enough information for the founder to recover what was removed or redirected.
4. Stage a clean client-facing build bundle. Remove dev notes, file-path explanations, source-data commentary, local-only URLs, and anything that reads like an implementation note instead of a public experience.
5. Deploy to standalone SkyeNet:

```bash
export SKYENET_AUTH="<shared gate bearer>"

npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.<company-slug> \
  --mount / \
  --url-mode subdomain \
  --public \
  --concurrency 4
```

For a private/gated surface, omit `--public` so the route registers with gate auth:

```bash
npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --project <project-slug> \
  --workspace <workspace-slug> \
  --host skyenet.<company-slug> \
  --mount / \
  --url-mode subdomain \
  --concurrency 4
```

6. Prove the route without browser automation unless the owner explicitly re-enables browser proof in the current task.
7. Update Founder Command/client credentials, live-link artifacts, QR/flyer targets, sitemaps, app manifests, public cross-links, and the deployment ledger.
8. Only after archive and proof receipts exist, redirect the old 0S `/skyenet/<project-slug>/` route to the standalone SkyeNet URL.

## Required Non-Browser Proof

Run the checks that fit the surface:

```bash
node --check <changed-js-files>
npm run 0s:skyenet:proof
```

For live route smoke:

```bash
curl -I https://skyenet.<company-slug>/
curl -s https://skyenet.<company-slug>/ | rg "<must-see client-facing text>"
```

For source bundle recovery, use the target workspace/project/deployment:

```bash
SKYENET_PROOF_WORKSPACE=<workspace-slug> \
SKYENET_PROOF_PROJECT=<project-slug> \
SKYENET_PROOF_DEPLOYMENT=<deployment-id> \
node tools/proof-skynet-source-download-live-http.mjs
```

Also prove:

- Platform-native public route returns `200`.
- Key assets return `200` with the correct content type.
- Manifest/service worker routes work if the app ships a PWA.
- Gated source-download returns `401` without auth.
- Gated source-download returns a non-empty `application/x-tar` bundle with auth.
- Source-transfer returns an authenticated receipt for `download`, `instant-download-link`, `skyedrive`, `skyevault`, or `secure-skye-pack`; storage-backed methods must also return a private object key, manifest key, byte count, hash, and `status: "completed"`.
- The 0S `/api/skyenet/source-download` proxy still passes the same download after auth.
- Old 0S public route redirects after migration, or is explicitly documented as temporary staging.

## Source Download And Transfer Boundary

The source-download API returns the deployed SkyeNet bundle. It is Netlify-style deploy recovery, not an automatic full repository export.

Use:

```text
https://skyenet.graylondonskyes.workers.dev/api/skyenet/source-download?workspace_id=<workspace>&project_id=<project>&deployment_id=<deployment>
```

Do not promise a full repo download from SkyeNet unless the full repo was intentionally uploaded as the deploy bundle. Full repo custody belongs in SkyeVault/repo-vault.

Client source access is not automatic. Use `POST /api/skyenet/source-transfer` when the owner approves a handoff. The secure source pack option is `secure-skye-pack`, which writes an encrypted canonical `.skye` pack backed by the SkyeSecure v2 source-pack lane and keeps the raw key in owner-admin custody.

## Acceptance Checklist

- Standalone SkyeNet URL is the public canonical URL.
- Old 0S `/skyenet/<project>/` content is archived before removal.
- Old 0S route redirects only after standalone proof passes.
- No app-specific password, PIN, admin code, or local auth lane was introduced.
- Founder Command and client records include the standalone URL, console URL, workspace/project/deployment IDs, and source-download URL.
- Public flyers, QR codes, blog posts, sitemaps, and cross-links point to standalone SkyeNet.
- Receipts are saved under `test-artifacts/`.
- Browser verification is left for the owner unless explicitly re-enabled.

## Paste-Ready Agent Prompt

Copy this into another agent chat and fill in the bracketed values:

```text
You are working in /home/lordkaixu/Projects/MetrAIyux-0S.

Migrate [SURFACE NAME] from the old 0S SkyeNet route to the real SkyeNet platform deployment. The shared SkyeNet origin is https://skyenet.graylondonskyes.workers.dev and the final public company route should be https://skyenet.[COMPANY-SLUG]/.

Read AGENTS.md, docs/SKYENET_UPLOAD_URL_MODEL.md, and docs/SKYENET_STANDALONE_MIGRATION_DIRECTIVE.md first. Use the shared FS27/SkyGate/Free99 gate only. Do not create any app-specific founder/admin/client passwords.

Before deleting or redirecting old 0S content, archive the current 0S /skyenet/[PROJECT-SLUG]/ route and source/bundle to SkyeVault or SkyDrive and save a receipt. Then stage a clean client-facing bundle with no dev notes, no source-path commentary, and no internal implementation copy.

Deploy with:

npm run skyenet:deploy -- \
  --dir <client-facing-build-folder> \
  --project [PROJECT-SLUG] \
  --workspace [WORKSPACE-SLUG] \
  --host skyenet.[COMPANY-SLUG] \
  --mount / \
  --url-mode subdomain \
  --public \
  --concurrency 4

For private/gated surfaces, omit --public.

Prove the platform-native SkyeNet route with non-browser checks only unless the owner explicitly re-enables browser proof. Confirm route 200, key assets 200, source-download 401 without auth, source-download tar download with shared gate auth, and 0S /api/skyenet/source-download proxy parity. Save receipts under test-artifacts/.

Update Founder Command/client records, live-link artifacts, QR/flyer targets, sitemaps, app manifests, public cross-links, and LIVE_DEPLOYMENT_LEDGER.md. After proof and archive receipts exist, convert the old 0S /skyenet/[PROJECT-SLUG]/ route to redirect to the standalone SkyeNet URL.

Do Valley Verified last if it is in scope, because another agent is actively changing that surface.
```
