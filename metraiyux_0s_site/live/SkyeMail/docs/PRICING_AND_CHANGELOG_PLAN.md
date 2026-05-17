# Pricing, Changelog, And Billing Readiness Plan

Date: 2026-05-16

## Purpose

SkyeMail should not gain serious platform features without a public record of what changed, what is live, what is free, and what is prepared for billing later.

The public contract is:

1. Changelog records shipped platform capabilities.
2. Pricing explains launch access and future paid tiers.
3. Billing hooks are planned before paid checkout is enabled.
4. Proof artifacts stay local/private unless intentionally published.

## Current Access Policy

Launch status: free.

SkyeMail can be used for FS27 gate-card onboarding and proof-lane mailbox work without charging the user during the launch/proof period.

Billing status: charge-ready structure only. No public paid checkout is active yet.

## Public Pages

- `/changelog`: product change history, proof status, and known production truth.
- `/pricing`: launch-free pricing, future tier structure, and billing-readiness checklist.
- `/live-proof`: proof page for visible operating evidence.
- `/`: primary entry surface with links to changelog and pricing.

## Future Billing Hooks

When charging starts, wire paid plan state through SkyGate FS27 first:

1. FS27 owns customer identity, customer ID, gate card, and billing state.
2. SkyeMail reads plan state from FS27/session claims or a signed billing status endpoint.
3. SkyeMail stores plan snapshot on workspace records for audit history.
4. Mailbox limits, alias limits, provider features, AI usage, and admin features key off the FS27 plan state.
5. Failed billing never deletes mail. It should pause upgrades, sending, aliases, or AI usage according to policy.

## Planned Tiers

Free Launch:

- FS27 gate-card onboarding.
- One SkyeMail workspace.
- One primary mailbox claim.
- Local proof-route inbox records.
- Proof loop and basic inbox access.

Starter:

- One production mailbox.
- Basic aliases.
- Send/receive provider routing.
- Delivery proof records.

Business:

- Multiple aliases and domain routing.
- Admin dashboard.
- Higher send and storage limits.
- Billing and AI usage tracking through FS27.

Operator:

- Multiple workspaces.
- Admin controls.
- Priority provisioning.
- Advanced proof, monitoring, and recovery lanes.

## Changelog Rules

Every serious platform change should add an entry with:

- Date.
- Status.
- Public surface impacted.
- Backend or database capability changed.
- Proof path or verification note.
- Known limitations.
- Billing/pricing impact.

## Acceptance Check

A release is ready for public use when:

- `/changelog` lists it.
- `/pricing` truthfully describes access and paid status.
- `/live-proof` or local proof confirms the behavior.
- The Worker deploy is live.
- No sensitive session tokens or private secrets are published.
