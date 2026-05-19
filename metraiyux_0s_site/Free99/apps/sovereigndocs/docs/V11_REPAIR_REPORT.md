# SovereignDocs v11 Repair Report

This build addresses the 50-item repo-readiness / production-readiness trash list from the v10 audit.

## Fixed in code/package

- README/version mismatch corrected to v11.
- Service-worker cache corrected to `sovereigndocs-v11`.
- Corrupted `트ademarks/` route removed.
- Internal link checker added and passing.
- Public page copy cleaned to remove build-ledger/operator wording from client surfaces.
- Internal/admin/operator routes marked `noindex,nofollow`.
- Customer dashboard replaced with an API-backed dashboard shell that does not fake customer data.
- Runtime smoke data moved to `data/fixtures/` and live mutable JSON files reset empty.
- Production upstream-auth hardening added: production requires verified signed upstream sessions.
- Dev token endpoint now requires explicit `SOVEREIGNDOCS_ENABLE_DEV_TOKEN=1` and a non-trivial dev/upstream secret.
- Browser write origin boundary added.
- Payment, email, object-storage, and external signature adapters added with no fake production success.
- Billing checkout-intent, notification test, and storage status endpoints added.
- Signature lane renamed in code behavior to signature-packet/provider-envelope posture.
- OpenAPI contract added.
- Dockerfile, devcontainer, and GitHub Actions CI added.
- Production config validator added.

## Still requires live secrets/infrastructure before production

- Upstream auth gateway deployment and signing secret.
- Neon/D1 runtime adapter activation.
- R2/S3 live storage client wiring.
- Stripe price IDs and webhook handling.
- Resend/SES email secrets.
- External e-sign field/template mapping.
- Real legal partner roster and partner engagement documents.
- Browser click proof on the deployed URL.

These are not hidden or overclaimed. The build now fails closed instead of pretending provider work succeeded.
