# ConnectLog v5 Irreplaceable Upgrade Ledger

ConnectLog v5 upgrades the app from a private contact vault into a relationship command OS while preserving the no-auth requirement. Upstream auth can wrap the app later, but this build does not spend code on account creation, login, sessions, or user management.

## New v5 surfaces

- Relationship Intelligence panel at `#intelligence`.
- Daily mission brief generated from local contact health, due dates, stale records, pinned contacts, and priority.
- Relationship queue with one-click Open, Script, and Contacted actions.
- Duplicate resolver dialog for email, phone, and exact name/company matches.
- CSV import lane alongside JSON import.
- Daily agenda `.ics` export for due and upcoming connections.
- Warm-list CSV export for actionable leads and strategic contacts.
- Persistent-storage request control for browsers that support durable PWA storage.
- Intro template generator using the saved exchange profile.
- Per-contact script copy, native share fallback, and individual vCard export.

## Functional upgrades

### CSV ingestion

The app can now import common prospect/contact CSV files with headers such as `name`, `business name`, `company`, `role`, `email`, `phone`, `website`, `linkedin`, `location`, `tags`, `notes`, and `next follow up`. Imported rows are normalized, hardened, merged by email/phone/name, and logged into each contact timeline.

### Duplicate resolution

The duplicate resolver detects groups using three fingerprints:

1. Email address.
2. Normalized phone number.
3. Exact normalized name plus company.

Merging preserves the highest-priority relationship, pins if any record was pinned, keeps the earliest follow-up date, combines unique details/tags/timelines, and leaves a merge note in the final timeline.

### Relationship command layer

The intelligence panel prioritizes contacts using local rules:

- Due follow-ups.
- Upcoming follow-ups.
- Dormant records.
- High or critical priority.
- Pinned strategic contacts.
- Existing relationship context.

No external AI, cloud service, or auth provider is required.

### Export and action flows

- `Export today agenda` builds a calendar file from due/upcoming contacts.
- `Copy daily brief` produces a plain-text relationship action list.
- `Export warm list` produces a CSV of actionable people.
- Contact cards can now copy a smart message script, share a contact summary through the browser share sheet when available, export a single vCard, export a reminder `.ics`, or mark contacted.

## Boundaries not claimed

- Public source still does not expose operator credentials.
- No live cloud sync was added.
- No backend notification worker was added.
- Mobile QR camera scanning still requires deployed HTTPS/device testing.
- Browser click-path E2E still needs a real browser pass outside this sandbox.

## Proof run

`npm run check` passes and runs:

- `node --check app.js`
- `node --check sw.js`
- `node --check qr-lite.js`
- `node tools/smoke-check.mjs`

The smoke check validates required files, duplicate HTML IDs, required v5 UI IDs, JS selector-to-HTML ID integrity, app version, service-worker cache version, manifest shortcuts, and presence of the new v5 feature functions.
