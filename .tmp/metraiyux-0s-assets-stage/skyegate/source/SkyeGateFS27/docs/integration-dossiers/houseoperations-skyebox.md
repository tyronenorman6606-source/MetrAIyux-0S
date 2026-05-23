# HouseOperations + SkyeBox Gate Dossier

HouseOperations is now tracked as a first-class FS27 platform lane. It owns task intake, vendor pressure, owner alerts, schedule, assignments, proof snapshots, and local gate mirror packets.

SkyeBox is mounted below HouseOperations as the local encrypted authenticator vault. FS27 does not claim custody of TOTP secrets. The gate owns identity, PIN unlock, recovery-code issuance, and audit records.

HouseOperations now also carries its own tutorial runbook and charge-ready billing surface. The tutorial executes the same local app actions the dashboard uses. The billing surface creates a local paid-plan intent and SkyePay offer URL; payment confirmation, plan-policy write, and activation remain FS27/SkyePay responsibilities.

## Gate Endpoints

- `POST /auth/pin/setup` - authenticated user creates a generated Gate ID and PIN credential.
- `POST /auth/pin/login` - user enters Gate ID plus PIN, or the combined digit string.
- `POST /auth/recovery/login` - consumes one recovery code and opens a recovery session.
- `POST /auth/recovery/rotate` - authenticated user rotates the recovery-code set.
- `POST /platform/events` - existing 0S mirror lane for privileged platform events when the mirror secret is configured.

## Commercial Offers

- `metraiyux-houseoperations-command` - $2,500 setup + $497/mo, paid-pending owner approval.
- `metraiyux-houseoperations-managed` - $5,000 setup + $997/mo, owner-approved after HouseOperations scope review.

## Recovery Boundary

Recovery codes are one-time codes stored only as hashes. Email delivery uses `AUTH_EMAIL_WEBHOOK_URL`. If that webhook is not configured, FS27 returns preview-mode codes once so local proof can run without pretending delivery happened.

## Custody Boundary

PIN unlock is a gate-session convenience and governance lane. It is not a promise that FS27 can recover a local SkyeBox vault password, decrypt browser-local authenticator secrets, or provide managed enterprise credential custody.

## Billing Boundary

HouseOperations can create and export billing intents for proof and handoff. It does not mark itself paid. SkyePay/FS27 owns Stripe checkout, owner approval, plan policy, and activation.
