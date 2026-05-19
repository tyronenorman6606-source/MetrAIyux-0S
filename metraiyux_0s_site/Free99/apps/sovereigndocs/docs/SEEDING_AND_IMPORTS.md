# SovereignDocs Seeding and Imports

SovereignDocs templates are folder-driven. Template content does not belong in React components or server routes.

Primary source:

```txt
template-library/
  manifest.json
  <category>/<template-id>/
    template.json
    questions.json
    document.md
    preview.md
    disclaimer.md
```

## Fast Template Creation

Create a starter template folder and manifest entry:

```bash
node scripts/create-template.mjs contracts-agreements master-service-agreement "Master Service Agreement"
```

Then edit the generated files inside:

```txt
template-library/contracts-agreements/master-service-agreement/
```

## Seed Inbox Import Flow

Drop complete template folders into:

```txt
seed-inbox/<category>/<template-id>/
```

Run:

```bash
npm run import:templates
npm run build:search
npm run smoke:platform
```

The importer copies valid folders into `template-library/`, updates `manifest.json`, and leaves the app logic untouched.

## Scraped / External Data Pipeline

For external template sourcing, use this transformation boundary:

1. Collect raw material outside the app.
2. Convert it into SovereignDocs template folders.
3. Place the complete folders into `seed-inbox/`.
4. Run the importer.
5. Run smoke validation.
6. Redeploy.

Do not paste unreviewed legal claims into public templates. Keep the not-legal-advice boundary visible.

## Required Files

### template.json

Controls title, category, risk, version, output formats, and description.

### questions.json

Controls guided intake fields. Every `{{placeholder}}` in `document.md` must have a matching question ID.

### document.md

The generated output template.

### preview.md

Public preview content shown before the builder.

### disclaimer.md

Template-level boundary shown during detail/builder workflows.

## Validation

Run:

```bash
npm run smoke:platform
```

This checks duplicate IDs, missing required files, category mismatches, placeholder/question mismatches, PWA wiring, API server files, and operator UI routes.
