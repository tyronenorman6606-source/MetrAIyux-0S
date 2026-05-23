# SkyeVault Pro · Local Sovereign Vault

SkyeVault Pro is the customer/operator local vault. It is mounted inside the 0S and must use the shared FS27/SkyGate/Free99 gate owned by the main Worker. Do not add a SkyeVault-specific founder password, owner password, or client admin gate.

## What changed

- Page-wide drag and drop for files, folders, and zip archives
- Zip unpacking straight into the vault when JSZip is available
- Current SkyeDocxMax is now the default editor for vault documents
- The older bundled `apps/docx` editor has been removed from the app tree; legacy URLs are gate-owned redirects to current SkyeDocxMax
- Local bridge file: `assets/js/skye-docxmax-vault-bridge.js`
- Hosted AI helper through a Netlify Function that reads `OPENAI_API_KEY` from Netlify environment variables
- Optional hosted vault backup is now a paid $4.99/mo Sovereign Backup add-on and is off by default
- Optional hosted member profile sync through Neon when `DATABASE_URL` is configured, with a Blobs fallback if it is not
- Optional Netlify Identity widget hooks for signup/login

## SkyeDocxMax bridge

SkyeVault Pro opens the current editor here:

```text
/Marketing-Made-Easy/SkyeDocxMax/editor.html?vaultDocId=<id>&source=skyevaultpro&returnTo=/Free99/apps/skyevaultpro/drive/index.html
```

The bridge loads SkyeVault Pro IndexedDB records, opens `.skye` packages, shadow-saves editor text, and writes commits back into the vault with **Push to Vault**.

## Dev drive import/export bridge

SkyeVault-Drop and SkyeVault Pro are still different systems:

- SkyeVault-Drop is the developer/repo push lane.
- SkyeVault Pro is the local customer/operator vault.

Use these repo-root commands to copy sanitized local material into a folder SkyeVault Pro can import:

```bash
npm run vault:pro:stage -- --source <folder> --out <local-import-folder>
npm run vault:pro:from-dev -- --out <local-import-folder>
npm run vault:pro:stage:latest -- --out <local-import-folder>
```

Then open SkyeVault Pro, open Settings, and use **Disk sync -> Import folder**. This keeps the import local and customer-controlled.

Stress proof for these commands is recorded at:

```text
test-artifacts/skyevaultpro-backed-claims/latest-proof.json
```

## Deploy notes

1. Push or upload the repo to Netlify.
2. Set these environment variables in Netlify:
   - `OPENAI_API_KEY` for the AI helper Function
   - `OPENAI_MODEL` optional, defaults to `gpt-5`
   - `DATABASE_URL` optional, for Neon-backed member profiles
   - `SKYEVAULTPRO_HOSTED_BACKUP_ENABLED=1` only when the $4.99/mo paid backup add-on is entitled and ready
3. Netlify Functions are configured in `netlify.toml`.
4. Hosted profile sync can wake up with Functions. Hosted vault backup remains disabled unless the paid add-on is active.

## Important reality notes

- Local vault storage still lives in IndexedDB first.
- Local folder sync and thumb-drive copies are the default recovery path.
- Hosted backup is optional, account-bound, paid, and disabled by default.
- Netlify Identity is wired as an option because you asked for it, but Netlify has deprecated Identity for new setups. If you want the clean long-term grown-up path, swap auth later to Auth0, Clerk, or Supabase Auth.
- The app still works without hosted auth: offline storage, thumb-drive sync, and local editing remain available.

## Sovereign backup add-on

Customer vault data is not backed up to company servers by default. The paid add-on is:

```text
SkyeVault Pro Sovereign Backup - $4.99/mo
```

Future hosted sync can target Neon or Citadel, but it must remain opt-in and entitlement-gated.

## Subscription angle

The membership profile form now stores a plan tier so you can map:

- Core → 256GB annual thumb drive
- Flow → 512GB annual thumb drive
- Pro → 1TB annual thumb drive

That is metadata and workflow support, not fulfillment automation. The app remembers the tier and hosted profile state; physical drive shipment remains an operator-owned fulfillment step.


## Founder page

A founder editorial page is available at `/founder/index.html` and linked from the home, vault, and SkyeDocx surfaces.
