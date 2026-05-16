# SoveReign13 Citadel Forge Commercial v1.3.0 Closure Ledger

## Closed in v1.3.0

✅ Added a production safety guard for trusted-header auth.  
✅ `TRUSTED_HEADER_AUTH` no longer defaults to true.  
✅ Trusted-header auth now requires `TRUSTED_HEADER_AUTH_SECRET` / `x-s13-gate-secret`.  
✅ Account API keys tied to suspended accounts are rejected.  
✅ Mutating account actions reject suspended accounts.  
✅ API keys now require scoped access for account, usage, meter, billing, and repo mutation lanes.  
✅ Added `/api/deployment/readiness` for operator proof.  
✅ Added control-plane repository creation through `/api/accounts/:id/repos`.  
✅ Repo creation checks plan entitlement before calling Forgejo.  
✅ Added internal browser Deployment Command Center.  
✅ Added gate integration contract.  
✅ Added live acceptance gates.  
✅ Added `scripts/closure-test.sh`.  
✅ Strengthened package tests against unsafe auth defaults.  

## Still not closed without live server proof

☐ Docker container boot on target server.  
☐ DNS and HTTPS issuance.  
☐ First Forgejo admin creation.  
☐ Forgejo admin API token activation.  
☐ Real tenant org provisioning.  
☐ Real repo creation against Forgejo API.  
☐ Real upstream gate/JWT integration.  
☐ Real Stripe checkout and webhook cycle.  
☐ Runner registration.  
☐ Workflow execution.  
☐ Off-server backup and restore rehearsal.  

## Commercial verdict

v1.3.0 is stronger than v1.2.0 because it removes the biggest production security footgun: public trusted-header auth. It is a serious sellable-alpha foundation after live activation, not a finished GitHub-scale SaaS.
