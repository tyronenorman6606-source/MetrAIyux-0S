# SovereignDocs v12 Code-Core Push

This build intentionally focuses on application code and business behavior, not deployment wiring.

## Added code engines

- Entitlement engine with plan-based feature checks and DOCX quota enforcement.
- Document lifecycle engine with explicit statuses and blocked invalid transitions.
- Packet assembly engine that combines multiple template outputs into one governed packet.
- Reminder engine for compliance/manual reminders with status transitions.
- Template operations queue for admin/reviewer patch requests instead of direct unsafe template mutation.
- Request validation helpers for object/field/array validation on new write endpoints.

## Added APIs

- `GET /api/entitlements`
- `GET /api/document-statuses`
- `GET /api/documents`
- `POST /api/documents/create-record`
- `POST /api/documents/:id/transition`
- `GET /api/packets`
- `POST /api/packets/assemble`
- `GET /api/reminders`
- `POST /api/reminders`
- `POST /api/reminders/:id/transition`
- `GET /api/templates/patch-requests`
- `POST /api/templates/patch-requests`
- `POST /api/templates/patch-requests/:id/transition`

## Changed behavior

- DOCX export now records document lifecycle records.
- DOCX export now checks plan quota. A free plan cannot export DOCX.
- Packet assembly downgrades high-risk templates to prep worksheets inside packets.
- Invalid document lifecycle transitions return conflict errors instead of silently accepting bad state.

## Still intentionally not included

No built-in auth was added. SovereignDocs still expects upstream auth. No fake provider success was added. Production provider activation remains a separate integration step.
