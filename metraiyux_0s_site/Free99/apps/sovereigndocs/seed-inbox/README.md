# SovereignDocs Seed Inbox

Drop complete template folders here when you want the platform to ingest new templates without editing app logic.

Required folder contract:

```txt
seed-inbox/<category>/<template-id>/
  template.json
  questions.json
  document.md
  preview.md
  disclaimer.md
```

Then run:

```bash
npm run import:templates
npm run build:search
npm run smoke:platform
```

The importer copies templates into `template-library/<category>/<template-id>/` and updates `template-library/manifest.json`.
