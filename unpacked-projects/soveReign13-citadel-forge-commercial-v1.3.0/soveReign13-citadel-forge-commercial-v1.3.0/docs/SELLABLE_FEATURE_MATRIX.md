# Sellable Feature Matrix

| Feature | Status | Notes |
|---|---:|---|
| Git repositories | ✅ Implemented by Forgejo | Requires live Forgejo boot. |
| Organizations | ✅ Implemented by Forgejo + provisioning hook | Control plane can call Forgejo API after `FORGEJO_ADMIN_TOKEN` is set. |
| Issues / pull requests / wiki / releases | ✅ Implemented by Forgejo | Not rebuilt in control plane. |
| Package registry | ✅ Implemented by Forgejo | Quota enforcement is snapshot/meter based in this package. |
| CI runners | ✅ Wired | Runner must be registered and proven live. |
| Branded portal | ✅ Implemented | Static public portal. |
| Commercial control dashboard | ✅ Implemented | HTML/JS operator dashboard. |
| Upstream auth handoff | ✅ Implemented | Trusted-header and JWT/JWKS lanes. Gate config still required. |
| Account/tenant records | ✅ Implemented | Control-plane database. |
| Plan table | ✅ Implemented | Free, Starter, Studio, Agency, Enterprise hidden. |
| Usage snapshots | ✅ Implemented | Pulls repo count/size from Forgejo API after admin token exists. |
| Entitlement checks | ✅ Implemented | Users, CI minutes, package MB; strict Forgejo write blocking is future work. |
| API keys | ✅ Implemented | Admin and account-scoped keys. Secrets shown once. |
| Billing checkout | ✅ Implemented conditionally | Calls Stripe only when Stripe env and price IDs exist. |
| Billing webhook | ✅ Implemented | Stripe HMAC verification and generic billing event intake. |
| Lead capture | ✅ Implemented | Stores leads. Email follow-up not included yet. |
| Admin metrics | ✅ Implemented | Accounts, MRR estimate, latest usage, leads. |
| Suspend/unsuspend | ✅ Implemented in control plane | Does not yet disable Forgejo users automatically. |
| SMTP invites | ☐ Not complete | Invitation records exist; sending is intentionally not enabled yet. |
| Customer self-serve account deletion | ☐ Not complete | Needs retention/legal policy first. |
| Off-server backup restore proof | ☐ Not complete | Backup script exists; restore drill must run on real server. |
