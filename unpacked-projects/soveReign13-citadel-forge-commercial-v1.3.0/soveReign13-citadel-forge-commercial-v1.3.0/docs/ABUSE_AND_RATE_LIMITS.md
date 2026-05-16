# Abuse and Rate Limit Controls

A sellable forge must protect CPU, storage, runners, package registry, and public signup.

## Implemented in v1.2.0

✅ Plan limit data is stored in `plans.limits_json`.  
✅ Latest usage snapshots are compared against plan limits.  
✅ Invitation creation checks member limit.  
✅ CI minute meter events check CI minute limit.  
✅ Package meter events check package limit.  
✅ Account suspension metadata exists.  
✅ Account locks are recorded.  
✅ Admin suspend/unsuspend endpoints exist.  
✅ API keys are hashed and revocable through database state.

## Not yet enforced directly inside Forgejo

Forgejo repository creation is not intercepted by the control plane in this package. Current enforcement is snapshot/meter based. For strict enforcement, add one of these next:

☐ Forgejo webhook worker that pauses/suspends accounts exceeding limits.  
☐ Reverse-proxy policy layer for selected Forgejo API writes.  
☐ Scheduled usage refresher that locks accounts over limit.  
☐ Runner-side SceptR agent that refuses jobs when CI limits are exhausted.  
☐ Package registry quota worker.

## Production recommended controls

- Keep public Forgejo registration disabled.
- Let the upstream gate own signup and identity.
- Require email verification in the gate.
- Add captcha or invite-only beta while testing.
- Restrict runner concurrency.
- Run untrusted CI on separate worker hosts, not the same host as Forgejo DB.
- Keep off-server backups.
- Monitor disk usage, runner CPU, container logs, and failed login volume.
