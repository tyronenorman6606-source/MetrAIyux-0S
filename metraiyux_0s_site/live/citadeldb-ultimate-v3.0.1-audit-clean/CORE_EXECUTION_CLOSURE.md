# Core Execution Closure

v2.7 fixes execution problems discovered by inspecting the actual code instead of appending more surfaces.

## Repaired

✅ Missing base Citadel schema migration added  
✅ Docker init base Citadel schema added  
✅ `citadel.apps`, `citadel.app_credentials`, `audit_events`, backup/restore/migration receipt tables now exist in migrations  
✅ Postgres role password DDL changed away from `$1` parameter usage  
✅ credential rotation now writes `citadel.app_credentials` receipt  
✅ schema/query consistency proof added  
✅ SQL policy negative proof added  
✅ Postgres DDL safety proof added  

## Why this matters

The Gateway was referencing base tables that were not present in `migrations/citadel-core`. That would break a clean migration path. v2.7 repairs that gap and adds a proof so it does not silently come back.
