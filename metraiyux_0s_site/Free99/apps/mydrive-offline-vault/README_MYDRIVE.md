# MyDrive Offline Encrypted Vault

MyDrive is a local/offline-first personal vault for files, folders, notes, passwords, private records, recovery codes, and encrypted JSON backups.

This is intentionally not a cloud drive. The offline architecture is the feature: vault content is sealed locally, stored locally, backed up locally, and restored locally. No Firebase. No remote database. No third-party UI scripts. No cloud sync.

## What this version adds

- Makes offline/local architecture the core product positioning inside the UI.
- Adds a dedicated Backup Center.
- Exports encrypted JSON backup packages with schema metadata and a SHA-256 integrity seal.
- Exports receipt JSON files that summarize a backup without including vault records.
- Imports MyDrive encrypted backup JSON and verifies v2 integrity before restore.
- Verifies backup JSON files before import.
- Keeps file contents, note bodies, password records, item names, tags, and item metadata encrypted in the local database.
- Keeps Resend as an optional manual recovery-code sender only. Vault storage never goes through Resend.

## Core features

- Local IndexedDB vault database.
- Web Crypto AES-GCM sealed item payloads.
- Encrypted item metadata envelopes.
- PBKDF2 passphrase wrapping for the vault data key.
- One-time recovery codes with mandatory passphrase rotation.
- Secure notes.
- Password records with generator/copy.
- File and folder import.
- Preview/download after unlock.
- Encrypted JSON backup export/import.
- Backup receipt export.
- Backup integrity verification.
- Lock and local purge controls.
- Offline PWA service worker.

## How to run

Open `index.html` in a modern Chromium-based browser, or serve the folder locally:

```bash
python3 -m http.server 8787
```

Then open `http://localhost:8787`.

## Backup workflow

1. Unlock MyDrive.
2. Open the Backup tab.
3. Click `Export Encrypted JSON`.
4. Store the downloaded JSON somewhere you control, such as USB storage, external disk, or a private archive.
5. Optionally click `Export Receipt JSON` and keep the receipt beside the backup.
6. Use `Verify Backup JSON` before trusting an old backup.
7. Use `Import Backup JSON` to restore. Import replaces the current local vault in that browser.

The backup JSON contains encrypted item envelopes and vault metadata. It does not export plaintext files, readable note bodies, readable password records, readable item names, or readable tags.

## Resend recovery email

Resend is optional. It is not used for storage or sync. It is only called when you manually press the recovery email send button and provide a Resend API key.

The readable recovery codes are not stored after the current session. Download, print, copy, or send them immediately.

## Security notes

- The passphrase is not stored.
- Vault content is encrypted before local IndexedDB storage.
- The raw vault key is wrapped by the passphrase envelope and recovery envelopes.
- Recovery codes are one-time recovery key wrappers, not account logins.
- Backup JSON files are encrypted packages and still require the passphrase or a valid recovery code after import.
- Browser security still matters: use a trusted device, keep the OS/browser clean, and keep your passphrase/recovery codes offline where possible.
