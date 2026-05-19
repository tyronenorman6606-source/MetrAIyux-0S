# SovereignDocs v9 Legal Partner Review Build

v9 adds a legal-partner review submission lane without changing SovereignDocs into a law firm.

## Added

- `POST /api/legal-review/submit`
- `GET /api/legal-review/submissions`
- `GET /api/legal-review/submissions/:id`
- `POST /api/legal-review/submissions/:id/route`
- `POST /api/legal-review/submissions/:id/partner-update`
- `GET /api/legal-partners/network`
- `GET /api/legal-review/service-plans`
- `GET /api/legal-review/statuses`

## Boundary

SovereignDocs creates automation, intake, review packets, routing records, and audit records. It does not provide legal advice, does not guarantee partner acceptance or outcome, and does not create an attorney-client relationship with SovereignDocs.

Any attorney-client relationship, if one is created, is between the user and the reviewing legal professional or firm under that partner's own engagement terms.
