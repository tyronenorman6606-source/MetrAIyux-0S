# Live Acceptance Gates

These gates define when SoveReign13 Citadel Forge can honestly be sold to paying users.

## Gate 1 — package integrity

✅ `./scripts/package-test.sh` passes.  
✅ `./scripts/closure-test.sh` passes.  
✅ No unsafe trusted-header default.  
✅ Control-plane JavaScript parses.  
✅ Docker Compose config renders on the target server.  

## Gate 2 — server boot

☐ `./scripts/deploy.sh` completes on the target server.  
☐ `./scripts/smoke.sh` passes.  
☐ Caddy issues certificates for portal, control, and forge domains.  
☐ SSH Git port answers.  

## Gate 3 — auth

☐ Production gate or JWT/OIDC is active.  
☐ `AUTH_MODE=dev` is disabled.  
☐ `/api/deployment/readiness` has no auth blockers.  
☐ Direct browser spoofing of `x-s13-user-email` without the gate secret returns 401.  

## Gate 4 — forge provisioning

☐ First Forgejo admin exists.  
☐ `FORGEJO_ADMIN_TOKEN` is set.  
☐ Control plane creates a tenant account.  
☐ Control plane provisions a Forgejo organization.  
☐ Control plane creates a repository through `/api/accounts/:id/repos`.  

## Gate 5 — CI runner

☐ Runner token created in Forgejo.  
☐ `./scripts/register-runner.sh` completes.  
☐ A workflow under `.forgejo/workflows` runs successfully.  
☐ CI minute meter event is recorded.  

## Gate 6 — billing

☐ Stripe or chosen provider is configured.  
☐ Checkout session opens for starter, studio, and agency plans.  
☐ Webhook signature verification passes.  
☐ `checkout.session.completed` upgrades the account plan.  
☐ Cancellation webhook updates billing status.  

## Gate 7 — backup and restore

☐ `./scripts/backup.sh` creates a backup.  
☐ Backup is copied off-server.  
☐ Restore rehearsal completes into a clean server or clean Docker volume set.  

## Honest sale claim after gates

Once all gates pass, the truthful customer-facing claim is:

“SoveReign13 Citadel Forge is a self-hosted commercial software forge for repositories, organizations, pull requests, issues, releases, packages, CI runners, account plans, usage tracking, and controlled provisioning.”

Do not claim global GitHub marketplace parity, GitHub-scale availability, unlimited CI, or enterprise SLA until those systems have live proof.
