# Neglected Core Closure

This pass handles work that should not have been pushed back to the operator.

## Done in v2.5

✅ Missing worker allowlist entries added:
- policy-check
- backup-manifest
- branch-clone

✅ Paid-route guard hooks expanded:
- setup secret generation
- guided proof action
- app lifecycle action
- credential rotation
- AI debug
- SQL execution
- table list
- table preview
- branch request
- self-service database provisioning

✅ Live stack E2E proof runner added:
- boots Docker Compose when Docker is available
- hits Gateway health
- creates self-service project
- provisions database
- runs SQL SELECT
- creates table
- inserts row
- lists tables
- previews rows
- checks jobs endpoint

## Not claimed from this environment

Docker is usually unavailable inside this packaging sandbox, so live-stack proof must run on the target deployment machine.
