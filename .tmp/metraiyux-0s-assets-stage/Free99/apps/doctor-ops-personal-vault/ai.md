# Doctor Ops Personal Vault

Doctor Ops Personal Vault is a local-first personal workflow companion for doctors. The public website is `index.html`; the private command deck launches from `app.html`; the workflow surfaces live under `apps/`.

The product provides 13 workflow apps for operational tracking: intake, SOAP note support, referrals, prior authorization, labs, medication reconciliation, imaging follow-up, care gaps, visit prep, consents, chronic care, discharge packets, and incident handoffs.

The product is designed for low-cost personal use, not as an enterprise EHR replacement. It emphasizes local data control, workspace export/import, local file-backed storage, audit receipts, version history, and backup/restore tools.

Brand assets:

- Official app logo: `assets/brand/doctor-ops-logo.png` and `.webp`
- Advertising graphic: `assets/brand/doctor-ops-advertising.png` and `.webp`
- App icons: `assets/brand/doctor-ops-icon-64.png`, `192.png`, `512.png`, and `.webp`

Data posture:

- Browser-only mode uses localStorage and manual workspace exports.
- Optional local runtime stores data in `data/platform-store.json`.
- Runtime backups are written to `data/backups/`.
- No external database, telemetry, analytics, or cloud sync is configured by default.
- Auth is inherited upstream; no local auth is implemented.

Boundary: not medical advice, legal advice, billing advice, HIPAA certification, or an EHR replacement.
