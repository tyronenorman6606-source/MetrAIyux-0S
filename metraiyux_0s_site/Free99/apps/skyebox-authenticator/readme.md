# SkyeBox Authenticator v3.0.0

SkyeBox Authenticator is a local-first encrypted TOTP vault packaged as a drop-ready PWA. It stores authenticator secrets only in the browser's local storage, encrypted through WebCrypto AES-GCM with a PBKDF2-derived key.

## Drop-ready use

Upload the full folder contents to Netlify, Cloudflare Pages, or any static host:

- `index.html`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- documentation/proof files are optional for runtime but included for operator review

No build step and no environment variables are required.

## v3 upgrades

- Master password rotation that re-encrypts the vault with a new key.
- Encrypted-backup merge flow for importing another SkyeBox backup without replacing the current vault.
- Local vault wipe control with typed confirmation.
- Configurable idle lock timer: 1, 5, 15, or 30 minutes.
- Best-effort clipboard clearing after token or otpauth URI copy.
- Copy otpauth URI action for migration into another authenticator.
- Duplicate-token warning before saving likely repeated entries.
- Stronger PBKDF2 default for newly created or migrated vaults: 310,000 iterations.
- Content Security Policy and no external runtime dependencies.
- Service worker cache bumped to v3.

## Important security note

This app has no cloud account and no server recovery. If the vault password is lost, the encrypted vault and exported backups cannot be decrypted. Export backups before wiping or moving devices.
