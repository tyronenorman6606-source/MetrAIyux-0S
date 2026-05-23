# v0.4.0 Paid Platform Hardening

v0.4.0 focuses on removing theater from the paid-product story.

## Added

✅ Project plan catalog in the Worker gateway.

✅ Runtime plan enforcement for capability allowlists, daily call limits, and per-minute rate limits.

✅ Project plan mutation endpoint: `/v1/admin/set-plan`.

✅ Plan catalog endpoint: `/v1/admin/plans`.

✅ Scoped key expiry support. Expired keys are rejected at authentication time.

✅ Console plan controls for plan name, project status, daily limit, rate limit, and capability allowlist.

✅ CLI hosted commands for plan catalog, setting plans, loading project state, and key revocation.

✅ SDK admin calls for plan catalog and plan mutation.

✅ Source smoke proof for paid-platform controls.

✅ Public truth gate that rejects banned overclaim phrases in docs and console copy.

## Still not claimed

☐ Deployed Worker behavior.

☐ Live KV binding behavior.

☐ Real provider delivery or provider-side mutation.

☐ Stripe subscription billing collection.

☐ Browser E2E proof against a deployed gateway and console.

## Operator standard

A capability can appear in a manifest because required credentials are present. That is not the same as a successful live provider transaction. SkyeAPI must keep those states separate in docs, console copy, and proof files.
