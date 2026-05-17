# Supabase Architecture Notes

## What to study

Supabase is strongest as developer-product packaging:

- local/self-host Docker workflow
- dashboard/studio experience
- API gateway around Postgres
- realtime service
- object storage service
- auth service boundaries
- documentation and onboarding UX

## Extractable patterns

### 1. Productized developer experience

CitadelDB should feel usable:

```text
citadel provision app
citadel migrate app
citadel backup-now
citadel restore-test
citadel health
```

v0.2 implementation:

✅ CLI wrapper exists  
✅ Gateway API exists  

### 2. Optional service pack

Supabase should not be the core database engine. It should be optional:

```text
CitadelDB Core
└─ Supabase Pack
   ├─ Studio
   ├─ REST
   ├─ Realtime
   └─ Storage
```

v0.2 implementation:

✅ deploy/supabase-pack manifest placeholder exists  
☐ live Supabase service pack not proven  

### 3. Dashboard/studio pattern

CitadelDB should eventually have its own dashboard, not expose Supabase branding as the main experience.

v0.2 implementation:

☐ dashboard not implemented  
✅ admin API foundation exists  

## Do not copy blindly

- Do not make Supabase the required core.
- Do not depend on Supabase Auth if upstream Omega Skygate/SoveReign auth is planned.
- Do not claim self-hosted Supabase gives managed-cloud backups/HA automatically.
- Do not expose Supabase service pack as the sovereign brand surface.

## CitadelDB decision

Supabase belongs in:

```text
engines/supabase-pack/
deploy/supabase-pack/
```

as an optional service pack, not the root architecture.
