# CitadelDB App Onboarding

Use this when moving a real app to CitadelDB.

## Dashboard path

```text
Dashboard → App Onboarding
```

## What it does

For each app database, CitadelDB can generate:

- framework-specific setup instructions
- DATABASE_URL template
- migration checklist
- app proof packet
- acceptance status

## Supported templates

- Node / Express
- Next.js / Prisma
- Python / SQLAlchemy
- Django
- Ruby on Rails
- Laravel

## Acceptance

An app is accepted only after:

☐ DATABASE_URL connection test  
☐ real write-smoke test  
☐ backup receipt  
☐ restore-test receipt  

No receipt, no claim.
