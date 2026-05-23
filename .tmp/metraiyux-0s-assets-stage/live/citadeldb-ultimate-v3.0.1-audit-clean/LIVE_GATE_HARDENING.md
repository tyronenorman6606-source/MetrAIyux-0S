# CitadelDB Live Gate Hardening

v2.1 adds hardening around the commercial gates.

## Included

- entitlement guard helper
- self-service provisioning gate hook
- upstream team/account context enforcement flag
- usage event recording
- branch receipt packet
- live gate dashboard
- live gate config check
- route gate events

## Important

This still does not fake live proof.

A gate is only truly closed when:

- the env flag is enabled
- the live route produces a blocking/allowed receipt
- the proof script or browser test confirms behavior

## Key env

```env
ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE=true
ENFORCE_UPSTREAM_TEAM_CONTEXT=true
USAGE_METERING_ENABLED=true
BRANCH_WORKER_ENABLED=true
REQUIRE_ACTIVE_SUBSCRIPTION=true
```
