# HouseOperations + SkyeBox Gate Dossier

HouseOperations is now tracked as a first-class FS27 platform lane. It owns task intake, vendor pressure, owner alerts, schedule, assignments, proof snapshots, and local gate mirror packets.

SkyeBox is mounted below HouseOperations as the local encrypted authenticator vault. FS27 does not claim custody of TOTP secrets. The gate owns identity, PIN unlock, recovery-code issuance, and audit records.

## Gate Endpoints

- `POST /auth/pin/setup` - authenticated user creates a generated Gate ID and PIN credential.
- `POST /auth/pin/login` - user enters Gate ID plus PIN, or the combined digit string.
- `POST /auth/recovery/login` - consumes one recovery code and opens a recovery session.
- `POST /auth/recovery/rotate` - authenticated user rotates the recovery-code set.
- `POST /platform/events` - existing 0S mirror lane for privileged platform events when the mirror secret is configured.

## Recovery Boundary

Recovery codes are one-time codes stored only as hashes. Email delivery uses `AUTH_EMAIL_WEBHOOK_URL`. If that webhook is not configured, FS27 returns preview-mode codes once so local proof can run without pretending delivery happened.

## Custody Boundary

PIN unlock is a gate-session convenience and governance lane. It is not a promise that FS27 can recover a local SkyeBox vault password, decrypt browser-local authenticator secrets, or provide managed enterprise credential custody.
