# SovereignDocs v3 Multi-Page Build

This package expands SovereignDocs from a hash-router-heavy surface into a real static multi-page platform.

## Generated page inventory

- Root marketing homepage
- `/documents/` public searchable template library
- `12` category pages under `/categories/{category}/`
- `148` template detail pages under `/templates/{category}/{template}/`
- `/builder/` guided builder
- `/workspace/` upload/edit workspace
- `/vault/` local vault
- `/audit/` local audit console
- `/ops/` ops and proof console
- `/api/` optional Node API docs/status
- `/admin/templates/` template payload generator
- pricing, business, individuals, agencies, security, terms, privacy, disclaimer, not-legal-advice, and use-case pages

## Proof

Run:

```bash
npm run smoke:all
```

The `template-library/` folder remains the source of truth.
