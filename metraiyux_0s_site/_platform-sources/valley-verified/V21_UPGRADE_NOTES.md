# PHX Verified Platform v21 Upgrade Notes

v21 implements the code upgrade list that came after the honest v20 review.

## Completed

✅ Full static business profile rendering for every published business route.

✅ Unique canonical URL and LocalBusiness JSON-LD on every generated business profile.

✅ Deploy output compaction: removed the old full profile shard payload directory and compacted the heaviest public/API datasets.

✅ Real runtime adapter expansion: JSON, D1, and Neon-style adapter classes now exist behind the runtime adapter factory.

✅ Protected upstream-auth admin app at `/protected-admin/` with no browser-entered proof identity fields.

✅ Enrichment queue export at `data/enrichment-queue.json` for website/phone/email discovery and AE cleanup.

✅ Persistent lead record service for quote statuses, AE assignment, owner contact attempts, and event history.

✅ Payment activation service separating checkout/payment events from admin-approved exposure activation.

✅ Notification worker service with signed jobs, dry-run receipts, delivery action conversion, and provider-webhook readiness.

✅ Owner-facing claim submission service and `phx-claim` function; claim packets now persist as owner_claim actions instead of only downloadable packets.

✅ Build modularization: `scripts/build.mjs` is now an orchestrator; the old generator lives in `scripts/build-core.mjs`, and enhancement layers are separate scripts.

## Proof

Run:

```bash
npm run codecheck
```

The package passed the full codecheck suite after the v21 upgrade, including the v21 smoke test.

## Boundary

This is still upstream-auth dependent. The admin app expects identity and roles to be injected before function execution. It does not add local login.
