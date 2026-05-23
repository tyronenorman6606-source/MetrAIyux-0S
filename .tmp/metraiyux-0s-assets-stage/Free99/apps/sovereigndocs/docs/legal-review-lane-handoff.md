# SovereignDocs Legal Review Lane Handoff

Date: 2026-05-20

## Source Truth

The current 0S registry does not mark the whole 0S as free and unlimited. SovereignDocs is still a paid, bundled, quote-only, or owner-approved lane until entitlement policy and usage caps are explicitly approved.

The seven law firms are provisioned as candidate legal-review workspaces only. Do not claim active partnership, legal approval, attorney review, or matter acceptance until outreach, bar/licensing verification, conflict rules, MSA/NDA, fee schedule, and payout destination are complete.

## Customer Flow

1. User creates or pastes a SovereignDocs document.
2. User clicks Submit for Legal Review or opens `/Free99/apps/sovereigndocs/review-submission/`.
3. The form requires all legal-boundary acknowledgments.
4. The API stores a review packet in the SovereignDocs vault.
5. The API creates a SkyePay checkout handoff for `sovereigndocs-legal-review-lane`.
6. Routing stays blocked until payment is confirmed.
7. Operator triage checks partner activation, conflicts, scope, and fee rules.
8. A candidate legal partner workspace receives the packet only after those gates pass.
9. Partner return logs the revised or approved document.
10. The payout ledger marks partner payout pending owner release.

## Partner Workspaces

The candidate workspaces are seeded in NorthStar SignIn Pro and listed in:

- `metraiyux_0s_site/valley-verified/data/legal-review-partner-candidates.json`
- `metraiyux_0s_site/Free99/apps/sovereigndocs/data/legal-partner-network.json`
- `metraiyux_0s_site/Free99/apps/sovereigndocs/data/legal-review-partner-workspaces.json`
- `metraiyux_0s_site/northstar/assets/data/seed-workspaces.json`

Each partner has:

- Valley Verified legal lane page
- Client app handoff page
- NorthStar SignIn Pro workspace seed
- SovereignDocs partner-workbench route
- SkyePay review checkout handoff

## Proof

Local proof script:

```bash
PORT=8791 node metraiyux_0s_site/Free99/apps/sovereigndocs/server/sovereigndocs-server.mjs
BASE_URL=http://127.0.0.1:8791 node metraiyux_0s_site/tests/sovereigndocs-legal-review-lane-proof.mjs
```

Proof receipt:

`test-artifacts/sovereigndocs-legal-review-lane-proof.json`

## Remaining Production Gates

- Deploy the 0S Worker changes.
- Deploy or sync the FS27 SkyePay catalog change.
- Run live checkout/store proof against the production SkyePay route.
- Run live SovereignDocs review submission proof behind the 0S/FS27 gate.
- Capture live receipts and update the production changelog only after deployment passes.
