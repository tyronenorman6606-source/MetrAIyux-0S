# Pricing, Changelog, And Billing Readiness Plan

Date: 2026-05-16

## Purpose

SkyeMail should not gain serious platform features without a public record of what changed, what is live, what is free, and what is prepared for billing later.

The public contract is:

1. Changelog records shipped platform capabilities.
2. Pricing explains launch access, paid AI Brain tiers, and what remains free.
3. Billing hooks are implemented before a feature is described as paid-live.
4. Proof artifacts stay local/private unless intentionally published.

## Current Access Policy

Launch mailbox status: free.

SkyeMail can be used for FS27 gate-card onboarding and proof-lane mailbox work without charging the user during the launch/proof period.

Billing status: mailbox access is still launch-free. The SkyeMail Brain now has FS27/SkyPay checkout create + claim routes for paid kAIxu response plans.

## Public Pages

- `/changelog`: product change history, proof status, and known production truth.
- `/pricing`: launch-free mailbox access, paid Brain AI tiers, and billing-readiness checklist.
- `/live-proof`: proof page for visible operating evidence.
- `/`: primary entry surface with links to changelog and pricing.

## Active Billing Hooks

Paid Brain AI plan state runs through SkyGate FS27 first:

1. FS27 owns customer identity, customer ID, gate card, and billing state.
2. SkyeMail reads plan state from FS27/session claims or a signed billing status endpoint.
3. SkyeMail stores plan snapshot on workspace records for audit history.
4. Mailbox AI usage, send-and-monitor behavior, and managed inbox features key off the FS27/SkyPay entitlement state.
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

AI Brain Starter / Plus / Managed:

- SkyPay checkout create and claim routes.
- kAIxu metered model calls.
- Usage events stored in `skymail.ai_usage_events`.
- Active entitlements stored in `skymail.ai_entitlements`.
- Reply monitors stored in `skymail.brain_monitors`.

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
