# Postgres Provisioning Closure

v2.8 fixes real Postgres execution risks.

## Fixed

✅ Docker init missed migrations 002 and 003; now synced  
✅ Gateway job allowlist missed worker jobs; now synced  
✅ `/admin/apps` ran `CREATE DATABASE` inside `BEGIN`; fixed  
✅ Self-service provisioning now checks role/database existence before creating  
✅ `citadel.app_credentials.secret_hint` mismatch fixed  
✅ provisioning DDL proof added  
✅ migration/init parity proof added  
✅ Gateway/worker job parity proof added  

## Why this matters

Postgres rejects `CREATE DATABASE` inside a transaction block. A clean deployment also needs Docker init SQL to match migration SQL. This pass closes both.
