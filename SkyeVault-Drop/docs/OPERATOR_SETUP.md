# Operator Setup — Client Drop Vault v1.9

Use `/operator.html` first. Enter `ADMIN_TOKEN` once to unlock the protected internal pages. The app stores an HttpOnly operator session cookie, then serves `/setup.html` and `/admin.html` through Netlify Function routes instead of shipping them as public static HTML.

## Setup order

1. Push the package to a private GitHub repo.
2. Create a Netlify site from that repo.
3. Create/select a Google Cloud project.
4. Enable the Google Drive API.
5. Create a Google service account.
6. Create/download the service-account JSON key.
7. Create a private Drive config folder.
8. Create at least one primary intake folder and one overflow/fallback folder.
9. Share every folder with the service account email as Editor/Contributor.
10. Open `/operator.html` on the live Netlify site.
11. Enter `ADMIN_TOKEN` and unlock `/setup.html`.
12. Use `/setup.html` to generate env vars, bootstrap config, optional notifications, and smoke commands.
13. Add Netlify env vars and redeploy.
14. Run `/setup.html` diagnostics.
15. Open `/admin.html`, load dashboard, run Health Preflight, run Drive tests, run Maintenance, and run notification test if configured.
16. Open `/` and upload a small proof file.
17. Verify session manifest, Drive file, receipt JSON, summary ledger, audit event, maintenance report behavior, and notification/client-receipt delivery if configured.
18. Upload one real large-video proof before sending the link to clients.

## Internal surface rule

`/admin.html` and `/setup.html` are operator-facing only. They are not present as public static files in v1.9. Netlify rewrites those paths to a protected Function that checks the operator session cookie. Do not link those routes from the public client upload website.

## Optional notifications

Set `NOTIFY_WEBHOOK_URL` for a generic JSON webhook. Set `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, and `NOTIFY_EMAIL_FROM` for email alerts through Resend. Use `/admin.html` → Test notification after deployment.


## v1.9 operator controls

Use Health Preflight before sending the public link to a client. Use Maintenance Sweep after testing large uploads or if a browser was closed mid-upload. Turnstile is optional, but portal code + rate limits + failed-code lockout should stay enabled for any public-facing link.

## v2.0 extra operator controls

After the basic Drive upload proof passes, run these closure checks from `/admin.html`:

1. Click **Run health preflight** and confirm Google auth, config folder, destination folders, notifications, scanner settings, and abuse controls are reported.
2. Click **Backup metadata** once. Confirm a timestamped `skye-upload-vault-backup-*.json` file appears in `BACKUP_FOLDER_ID` or the config folder.
3. Download **Ledger CSV**, **Sessions CSV**, **Events CSV**, and **All JSON** from Export Center.
4. If notifications are configured, click **Replay notification** on a completed receipt row.
5. If scanner mode is enabled, confirm ledger rows include scan status and that the scanner/audit event appears in the proof trail.
6. Install Playwright locally only when you want real browser proof: `npm i -D playwright && npx playwright install chromium`, then run `npm run e2e:browser` with `BASE_URL` pointed at your deployed site.

Scanner note: the scanner workflow is a handoff/review adapter. It records scanner state and can call an external scanner/review endpoint. It does not claim to perform local malware scanning of private Google Drive files unless you configure such a scanner endpoint.

## Repository snapshot workflow

Use this when a whole source workspace needs to be preserved in the vault as one receipt-backed package. This is a vault intake workflow, not a Git push remote.

From the source repo:

```bash
npm run vault:dry-run
npm run vault:push
```

The dry run creates a sanitized zip and reports how many files were included and how many secret-looking files were excluded. The push command uploads the zip through the deployed vault, finalizes the R2 multipart upload, prints a short-lived download link for the archived package, and writes a local `.skyevault-out/skyevault-receipt-*.json` file with the same recovery metadata.

## Developer Workspace Vaults

For devs using this vault from their own repos, do not hand out the operator token or the general client portal key. Paid Skyepay subscriptions should call the signed `/.netlify/functions/provision-workspace` endpoint so the vault writes each dev workspace into `skye-upload-vault-workspaces.json` in R2.

Required vault env:

```bash
SKYEVAULT_PROVISIONING_SECRET=long-shared-secret-used-by-skyepay
```

`SKYEVAULT_DEVELOPER_WORKSPACES` is now only a bootstrap/emergency fallback. Prefer the R2 registry created by the provisioning endpoint.

Objects uploaded through a developer workspace key land under:

```text
<destination-prefix>/workspaces/<workspaceId>/<sessionId>/<archive-name>.zip
```

The receipt, session manifest, audit event, and object metadata all carry `workspaceId` and `developerId`, so the admin side can recover who pushed what while each dev stays inside their own workspace boundary.

Before using it with client code, confirm:

- `.env*`, private keys, database dumps, backup folders, WAL archives, `.git`, `node_modules`, and old archives are excluded.
- The command has the correct `SKYEVAULT_DROP_URL`.
- The local operator has `CLIENT_PORTAL_KEY` or `SKYEVAULT_PORTAL_KEY`.
- If CORS requires it, `SKYEVAULT_UPLOAD_ORIGIN` matches an allowed deployed origin.
