# SkyePics App v1.7.0

SkyePics is a local-first encrypted camera vault for developer screenshots, passwords, keys, config panels, recovery codes, and other sensitive visual records. It is not SaaS. It has no tenant system and no external database.

## What it does

- Opens with a cinematic SkyePics intro sequence before the landing page on first launch.
- Lets users replay the intro from the landing page.
- Uses the transparent SkyePics logo artwork across the intro, landing, unlock gate, app navigation, header, PWA icons, and production build.
- Opens with an interactive SkyePics landing page before the user enters the actual vault app.
- Includes a built-in tutorial system with a front-door overlay, an unlocked Guide lane, clickable walkthrough steps, and plain safety rules.
- Uses the browser camera through `getUserMedia` and saves captures only into the SkyePics local vault.
- Imports existing image files into the same encrypted vault.
- Stores encrypted photo files inside Origin Private File System browser storage.
- Stores the encrypted vault manifest in localStorage.
- Encrypts the manifest and every photo with Web Crypto PBKDF2 + AES-GCM.
- Unlocks with a local vault password only.
- Runs OCR locally with Tesseract.js so text extraction does not require a server.
- Detects likely API keys, tokens, passwords, database URLs, cloud keys, and private-key blocks.
- Lets the user correct OCR output in an editor and save the corrected record.
- Supports metadata for provider/system, account/project, URL/console, tags, notes, and rotation date.
- Masks secret values by default and blocks reveal while Privacy Shield is active.
- Copies values or `.env` lines with configurable clipboard clear attempts.
- Exports encrypted backups and restores encrypted backups with password and checksum verification.
- Runs vault health checks that decrypt-verify encrypted photo files and record checksums.
- Runs redacted secret-risk audits for duplicate values, weak password-like values, overdue rotations, missing rotation dates, long-lived sensitive records, unlinked records, and private-key records.
- Exports redacted recovery receipts, integrity ledgers, secret-risk ledgers, recovery drill reports, and printable emergency recovery kits.
- Requests persistent browser storage and includes an install-ready PWA shell.
- Supports auto-lock after inactivity and optional lock when the app/tab is hidden.

## v1.7 UX structure

The app now has a cinematic front sequence plus the v1.6 front door/tutorial flow:

- Intro: transparent-logo cinematic reveal, vault rings, scan pass, timed copy beats, progress bar, replay, skip, and Enter SkyePics controls.
- Landing: spectacular logo front door, interactive Capture/Scan/Recover story cards, app preview, tutorial preview, and intro replay.
- Gate: create, unlock, or restore the encrypted vault after the landing page.
- Guide: in-app tutorial lane with full workflow, clickable steps, and operational safety rules.
- Command: mission home, vault stats, latest capture, latest secret, and flow summary.
- Camera: cinematic camera preview, HUD, capture flash, image import, and capture review.
- Vault: encrypted photo gallery, selected photo detail, linked secret summary, and photo metadata editing.
- Scan: selected-photo OCR preview, scan beam, local OCR progress, candidates, raw OCR editor, and bulk save.
- Secrets: encrypted record editor, provider/account/url/tags/rotation fields, masked cards, reveal/copy/edit/delete.
- Backup: install readiness, backup export, verify/restore, health check, persistence, recovery drill, emergency kit, password rotation.
- Security: redacted secret-risk audit, behavior settings, and encrypted audit trail visibility.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite localhost URL. Camera access requires localhost or HTTPS.

## Production build

```bash
npm run build
npm run preview
```

The static build is generated in `dist/`.

## Proof commands

```bash
npm install
npm test
npm run smoke
npm run build
```

These passed for v1.7.0 in the packaged build. `npm install` reported 0 vulnerabilities.

## Security model

SkyePics is designed around local browser storage, client-side encryption, and encrypted backup files. Photos are not intentionally saved to the device camera roll. They are captured/imported into the app vault and encrypted before private file storage writes.

The backup file is encrypted, but it is only useful if the user also remembers or stores the vault password that was active when the backup was exported. Old backups keep the old password after password rotation.

The recovery kit is intentionally redacted. It includes counts, checksum, and restore instructions, but no secret values and no image bytes.

The intro/landing/tutorial surfaces do not add a backend and do not change the vault security model.

## Honest limits

Browser local storage is not a permanent archive by itself. A user can lose local data by clearing site data, changing browser profiles, damaging the device, or reinstalling the browser. Export encrypted backups after important captures.

OCR is not a truth source. The extracted text must be reviewed before saving or using any key/password.

Camera capture cannot be physically tested inside a headless build sandbox. Test camera capture on a real device over localhost or HTTPS.

A real restore drill should be done on a second browser profile/device using an exported `.skyepics-backup.json` file.
