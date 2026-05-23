# Template Library Guide

Every SovereignDocs template lives in `template-library/`.

## Required files

- `template.json`: template metadata, risk level, version, tags, output formats
- `questions.json`: builder intake fields
- `document.md`: generated document body with `{{placeholders}}`
- `preview.md`: public preview copy
- `disclaimer.md`: template-specific boundary notice

## Placeholder rule

Every `{{placeholder}}` in `document.md` should have a matching question `id` in `questions.json`, unless the app explicitly supports it as a system field.

## Risk levels

- `low`: simple operational paperwork
- `medium`: business and finance paperwork
- `high`: property, employment, notices, debt, or deadline-sensitive paperwork
- `sensitive`: estate, healthcare, family, court, tax, immigration, or similarly serious matters

## Content rule

Templates may provide structured paperwork, but must not claim to provide legal advice, attorney review, enforceability guarantees, or representation.
