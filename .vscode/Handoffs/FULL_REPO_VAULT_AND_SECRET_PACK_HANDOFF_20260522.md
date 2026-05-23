# Full Repo SkyDrive + Secret Pack Handoff

Updated: 2026-05-22 UTC  
Repo: `/workspaces/MetrAIyux-0S`

## Current Truth

This pass implemented the Cloudflare/R2 full-repo streaming lane, added the AI-readable install surface, and deployed SkyeVault-Drop to Cloudflare Workers.

Important: the deployed URL exists, but the required headed live-browser proof did **not** complete to a passing JSON receipt before interruptions/timeouts. Treat the live URL as deployed but not final-proof-ready until the proof gate is completed.

Live deployed URL:

```text
https://skyevault-drop.graylondonskyes.workers.dev
```

Cloudflare deploy result:

```text
Worker: skyevault-drop
Version ID: 74bdde5c-7a1e-4f46-8128-7933056a3939
Assets uploaded: /vault.html, /index.html, /assets/styles.css, /repo.html, /agent-install.html, /process.html, /upload.html
```

## What Was Built

The repo-scale vault lane is now a streaming design:

- Full repo artifact streams as encrypted `tar.zst.enc` to Cloudflare R2 multipart upload.
- Unlock/control material is kept in a small SkyeSecure `.skyesecrets` pack.
- No 90 GB local zip is required before upload.
- Owner/admin access uses the existing FS27/SkyGate/Free99/shared gate lane.
- No provider keys or app-specific passwords were added to the UI.
- Customer plans can meter repo pushes at 50 GB and 100 GB.
- Owner/admin/free99 resolves to an unlimited-style repo push policy.

## IDE / Git Remote / Forgejo Clarification

Added after the 2026-05-22 operator question about whether the repo already has Forgejo and whether drives/vaults can be integrated directly with IDEs.

Current truth from this workspace:

- The active Git remote for `/workspaces/MetrAIyux-0S` is still GitHub: `https://github.com/tyronenorman6606-source/MetrAIyux-0S`.
- The repo already contains a real SkyeVault Git remote lane that can behave like a private Git remote for VS Code/Codespaces-style workflows.
- The Git remote service is not just a backup zip. It supports normal `git push`, `git fetch`, and `git clone` behavior against bare repositories.
- Primary local docs are `docs/SKYEVAULT_GIT_REMOTE_SERVICE.md`, `docs/SKYEVAULT_REPO_WORKSPACE_UPGRADE.md`, and `SKYEVAULT_REPO_PUSH.md`.
- Primary runtime files are `tools/skyevault-git-remote-server.mjs`, `tools/skyevault-repo-workspace.mjs`, and `deploy/skyevault-git-remote/`.
- Deploy support exists at `deploy/skyevault-git-remote/compose.yml`, `deploy/skyevault-git-remote/Dockerfile`, `deploy/skyevault-git-remote/systemd/skyevault-git-remote.service`, and `deploy/skyevault-git-remote/ssh/skyevault-ssh-command.sh`.
- Package scripts already include `vault:git:remote`, `vault:git:remote:proof`, `vault:repo`, `vault:git:push`, `vault:git:dry-run`, and `vault:repo:full`.
- A Citadel Forge / Forgejo lane is documented as locally healthy in `obsidian-vault/10-production/Production Blockers.md` and `docs/METRAIYUX_0S_CHATGPT_HANDOFF.md`, but production remains blocked by external account/deployment decisions.
- An unpacked Forgejo-adjacent source folder exists at `unpacked-projects/soveReign13-citadel-forge-commercial-v1.3.0/soveReign13-citadel-forge-commercial-v1.3.0/forgejo`, but it appears to contain only a `custom/` folder in this checkout.

Clean operator answer:

```text
Yes, the repo already has the pieces for a self-owned IDE-integrated repo/vault lane.
Use SkyeVault Git Remote for immediate Git push/fetch/clone behavior.
Treat Citadel Forge/Forgejo as the heavier Forgejo-backed product/server lane that still needs production domain, DNS, auth policy, runner, Stripe, and backup/restore decisions.
```

Recommended local flow:

```bash
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:git:remote
npm run vault:repo -- init --dir=. --workspace=metraiyux --repo=MetrAIyux-0S
SKYEVAULT_GIT_REMOTE_TOKEN='from-secret-manager' npm run vault:repo -- push --dir=. --branch=main
```

Recommended container/server flow:

```bash
export SKYEVAULT_GATE_INTROSPECT_URL='https://<gate-host>/auth-introspect'
docker compose -f deploy/skyevault-git-remote/compose.yml up -d --build
curl -fsS http://127.0.0.1:8787/health
```

Auth rule reminder: keep this gate-owned. Do not create a new Forgejo/SkyeVault app-specific owner/admin password. Use the shared FS27/SkyGate/Free99 lane, Gate-issued bearer/session tokens, and the existing SkyeVault gate introspection settings.

## Public Install Surface

Added:

```text
SkyeVault-Drop/public/agent-install.html
```

Purpose:

- Gives devs and coding agents one page to read.
- Lists commands, endpoint names, env variable names, auth rules, plan model, output receipts, and restore flow.
- Does not expose secret values.

Linked from:

```text
SkyeVault-Drop/public/index.html
SkyeVault-Drop/public/upload.html
SkyeVault-Drop/public/vault.html
SkyeVault-Drop/public/repo.html
SkyeVault-Drop/public/process.html
```

Note: Cloudflare Assets redirects `.html` URLs to clean routes. For example:

```text
/agent-install.html -> /agent-install
```

That is normal for this deployment and should be captured in the browser proof receipt as a redirect/final URL.

## Core Files Changed

Streaming/R2 lane:

```text
SkyeVault-Drop/netlify/functions/_lib/google-drive.js
SkyeVault-Drop/netlify/functions/_lib/config.js
SkyeVault-Drop/netlify/functions/upload-session.js
SkyeVault-Drop/netlify/functions/upload-part-url.js
SkyeVault-Drop/netlify/functions/upload-complete.js
SkyeVault-Drop/cloudflare/worker.mjs
```

Auth/plans/metering:

```text
SkyeVault-Drop/netlify/functions/_lib/security.js
SkyeVault-Drop/netlify/functions/_lib/workspace-registry.js
SkyeVault-Drop/netlify/functions/upload-session.js
```

Operator commands/env loading:

```text
tools/skyevault-full-repo-push.mjs
SkyeVault-Drop/scripts/run-with-root-env.mjs
package.json
SkyeVault-Drop/package.json
```

Public surface:

```text
SkyeVault-Drop/public/agent-install.html
SkyeVault-Drop/public/assets/styles.css
SkyeVault-Drop/public/index.html
SkyeVault-Drop/public/upload.html
SkyeVault-Drop/public/vault.html
SkyeVault-Drop/public/repo.html
SkyeVault-Drop/public/process.html
```

## New API Endpoint

Added:

```text
/api/upload-part-url
```

Purpose:

- Authenticates with the existing portal/admin/gate lane.
- Validates the streaming upload session.
- Mints batched presigned R2 multipart part URLs on demand.
- Avoids precomputing thousands of part URLs for 50 GB to 100 GB+ streams.

## Auth Rule Status

The SkyeVault full-repo lane follows the repo auth rule:

- No app-specific founder/admin/client passwords were added.
- Owner/admin can enter through shared FS27/SkyGate/Free99 material.
- Accepted headers include `Authorization`, `x-admin-token`, `x-free99-admin-code`, `x-free99-gate-session`, and `x-skye-gate-session`.
- Mounted/owner access should continue to rely on the existing gate/session helpers.

The env loader added at:

```text
SkyeVault-Drop/scripts/run-with-root-env.mjs
```

loads both:

```text
/workspaces/MetrAIyux-0S/.env
/workspaces/MetrAIyux-0S/SkyeVault-Drop/.env
```

It maps existing root/app Cloudflare and R2 env key names into the names Wrangler and the upload tools expect. It never prints secret values.

## Plan Model

Owner/admin/free99:

```text
repoPushMode: unlimited
maxTotalSubmissionGb: 5000
maxFileSizeGb: 5000
repoPushesPerWindow: 0
```

Customer plans:

```text
repo-50gb: 50 GB, default 5 repo pushes per 30 days
repo-100gb: 100 GB, default 10 repo pushes per 30 days
default portal: 50 GB, default 1 repo push per 30 days
```

Env overrides:

```bash
SKYEVAULT_REPO_50GB_PUSHES_PER_WINDOW=5
SKYEVAULT_REPO_100GB_PUSHES_PER_WINDOW=10
SKYEVAULT_DEFAULT_REPO_PUSHES_PER_WINDOW=1
SKYEVAULT_DEFAULT_REPO_PUSH_GB=50
SKYEVAULT_REPO_PUSH_WINDOW_DAYS=30
SKYEVAULT_DEFAULT_PORTAL_MAX_TOTAL_GB=50
SKYEVAULT_DEFAULT_PORTAL_MAX_FILE_GB=50
```

## Operator Commands

Dry run:

```bash
cd /workspaces/MetrAIyux-0S
npm run vault:repo:full:dry-run -- --max-gb=100 --out-dir=/tmp/skyevault-full-repo-dry-run-closure
```

Real owner/admin full repo push:

```bash
cd /workspaces/MetrAIyux-0S
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
npm run vault:repo:full -- --max-gb=100 --out-dir=/tmp/skyevault-full-repo-live
```

Small streaming proof before the real repo:

```bash
cd /workspaces/MetrAIyux-0S
rm -rf /tmp/skyevault-stream-proof
mkdir -p /tmp/skyevault-stream-proof/source
printf 'proof\n' > /tmp/skyevault-stream-proof/source/proof.txt
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev \
npm run vault:repo:full -- \
  --repo=/tmp/skyevault-stream-proof/source \
  --repo-name=stream-proof \
  --max-gb=1 \
  --out-dir=/tmp/skyevault-stream-proof/run
```

The command writes local custody files under the chosen `/tmp/...` output dir:

```text
PLAN.json
UNLOCK_CODES.txt
<repo>-artifact-key-material.txt
SKYDRIVE_UPLOAD_RECEIPT.json
RESTORE.md
<repo>-skydrive-control-<stamp>.skyesecrets
FULL_REPO_SKYDRIVE_HANDOFF.json
full-repo-stream-upload.log
```

Never paste `UNLOCK_CODES.txt` or `*-artifact-key-material.txt` into chat, commits, screenshots, tickets, or public docs.

## Verification Completed

Passed syntax/static checks:

```bash
node --check tools/skyevault-full-repo-push.mjs
node --check SkyeVault-Drop/scripts/run-with-root-env.mjs
node --check SkyeVault-Drop/netlify/functions/upload-session.js
node --check SkyeVault-Drop/netlify/functions/upload-part-url.js
node --check SkyeVault-Drop/netlify/functions/upload-complete.js
node --check SkyeVault-Drop/netlify/functions/_lib/google-drive.js
node --check SkyeVault-Drop/netlify/functions/_lib/security.js
node --check SkyeVault-Drop/netlify/functions/_lib/workspace-registry.js
node --check SkyeVault-Drop/cloudflare/worker.mjs
npm run check --prefix SkyeVault-Drop
```

Passed full repo command dry-run:

```bash
npm run vault:repo:full:dry-run -- --max-gb=100 --out-dir=/tmp/skyevault-full-repo-dry-run-closure
```

Dry-run output:

```text
/tmp/skyevault-full-repo-dry-run-closure/PLAN.json
/tmp/skyevault-full-repo-dry-run-closure/UNLOCK_CODES.txt
```

Passed Cloudflare Worker dry-run:

```bash
cd /workspaces/MetrAIyux-0S/SkyeVault-Drop
npm run cloudflare:check
```

Dry-run result:

```text
Wrangler 4.92.0
Read 30 files from the assets directory
Total Upload: 235.18 KiB / gzip: 49.29 KiB
Dry-run exited successfully
```

Passed deployment:

```bash
cd /workspaces/MetrAIyux-0S/SkyeVault-Drop
npm run cloudflare:deploy
```

Deploy result:

```text
https://skyevault-drop.graylondonskyes.workers.dev
Version ID: 74bdde5c-7a1e-4f46-8128-7933056a3939
```

## Verification Not Completed

The repo-required headed live-browser proof did not complete to a passing JSON receipt.

Attempts:

```text
test-artifacts/live-browser-verifier/2026-05-22T10-09-24-468Z-skyevault-agent-install-20260522
```

This produced 9 desktop screenshots for the home route but no final `live-browser-verification-report.json`.

```text
test-artifacts/live-browser-verifier/2026-05-22T11-21-27-181Z-skyevault-closure-proof
```

This produced screenshots but failed on a Playwright screenshot timeout while trying to capture an extra full-page screenshot.

```text
test-artifacts/live-browser-verifier/2026-05-22T11-25-18-127Z-skyevault-closure-proof
test-artifacts/live-browser-verifier/2026-05-22T12-13-18-741Z-skyevault-drop-public-surfaces
```

These did not produce a final JSON receipt before interruption/termination.

Therefore: do not present the deployed link as production-ready until headed proof is rerun and passes.

## Required Next Proof

Run a focused headed proof that avoids full-page screenshots and records viewport scroll-stop screenshots only:

```bash
cd /workspaces/MetrAIyux-0S
xvfb-run -a npm run proof:live-browser -- \
  --url https://skyevault-drop.graylondonskyes.workers.dev/ \
  --url https://skyevault-drop.graylondonskyes.workers.dev/agent-install \
  --url https://skyevault-drop.graylondonskyes.workers.dev/upload \
  --url https://skyevault-drop.graylondonskyes.workers.dev/vault \
  --url https://skyevault-drop.graylondonskyes.workers.dev/repo \
  --url https://skyevault-drop.graylondonskyes.workers.dev/process \
  --expect "SkyeVault-Drop" \
  --expect "AI Install" \
  --label skyevault-drop-public-surfaces
```

If the generic verifier still hangs on screenshot capture, create a smaller SkyeVault-specific proof script under `tools/` and make it write:

```text
test-artifacts/live-browser-verifier/<stamp>-skyevault-drop-public-surfaces/skyevault-live-browser-proof.json
```

The receipt must include:

- URL and final URL after redirects.
- Desktop viewport 1440x980.
- Mobile viewport 390x844.
- Human-style clicks on nav/cards/CTA.
- Upload form edits.
- Vault form edits.
- Full scroll stop list for each route.
- Per-stop viewport screenshot paths.
- Nonblank/visible text/media metrics.
- Horizontal overflow checks.
- Console errors.
- Failed network requests.

## Deployment Notes

`npm install` inside `SkyeVault-Drop` hit an npm CLI internal error:

```text
npm error Exit handler never called!
```

Even with that npm error, `node_modules/wrangler/bin/wrangler.js` was present and Wrangler reported:

```text
4.92.0
```

The local generated `node_modules` folder was removed afterward to recover workspace disk. To redeploy later, reinstall or use an available Wrangler lane.

Disk note:

```text
/workspaces` became tight during dependency install.
/tmp` had enough space and should be used for repo archives, proof work dirs, and full repo output.
```

## Outstanding End-To-End Items

Not done yet:

- Real full repo upload of `/workspaces/MetrAIyux-0S`.
- Small streaming upload proof against the deployed Worker.
- Headed live-browser JSON proof receipt for the deployed SkyeVault public surfaces.
- Final admin recovery/download proof using a valid shared FS27/Free99 owner session.

Do these in order:

1. Run the headed browser proof and get a passing JSON receipt.
2. Run the small `/tmp/skyevault-stream-proof` upload.
3. Run the real 100 GB-capable owner/admin full repo push.
4. Save the resulting `FULL_REPO_SKYDRIVE_HANDOFF.json` path and secret pack path into a new handoff entry.

## Key Links

Deployed SkyeVault-Drop Worker, not final-proof-ready yet:

```text
https://skyevault-drop.graylondonskyes.workers.dev
```

AI install surface:

```text
https://skyevault-drop.graylondonskyes.workers.dev/agent-install
```

Owner/admin gate:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/login.html
```

SkyeVault Pro drive:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/apps/skyevaultpro/drive/index.html
```

SkyeSecure unlocker source:

```text
/workspaces/MetrAIyux-0S/metraiyux_0s_site/skye-secure-secret-packs/app.html
```

## Safety Notes

- Do not expose Cloudflare/R2/provider keys in UI.
- Do not create per-app owner passwords.
- Keep full-repo temporary output in `/tmp`.
- Keep `.skyesecrets` for unlock/control material, not the huge repo artifact itself.
- The new `vault:repo:full` lane is the correct lane for 90 GB brain-scale custody.
- Existing sanitized `vault:push` remains useful for smaller safe source handoffs.
