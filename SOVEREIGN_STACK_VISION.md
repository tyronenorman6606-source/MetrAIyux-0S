# MetrAIyux 0S Sovereign Stack Vision

Effective date: 2026-05-17

## The Thesis

MetrAIyux 0S is not just a SaaS dashboard. It is the customer/operator business OS that can run on its own VPS while reporting back to FS27 for gate policy, billing truth, usage metering, and platform telemetry.

The commercial promise is simple:

- Customers pay for a governed operating system, not unlimited raw AI.
- Every plan has explicit workspace, request, device, storage, model, and AI spend limits.
- The AI cap is a metered dollar ceiling at FS27 billable rates.
- AI caps are FS27 billable spend ceilings, not unlimited upstream provider usage.
- Stripe and SkyePay confirm payment, then the workspace unlocks automatically.
- FS27 remains the parent gate that sees action events, billable events, privileged events, usage, cost basis, margin, and operational state.

## Money Model

MetrAIyux makes money from multiple controlled lanes:

1. Setup fees pay for configuration, handoff, onboarding, workspace shaping, and launch readiness.
2. Monthly subscriptions pay for the managed operating system, policy gates, ledgers, customer surfaces, and support.
3. AI usage is priced through FS27 billable model rates with margin above upstream provider cost.
4. Plan caps prevent unlimited usage exposure. Customers who exceed caps need top-ups, upgrades, or written enterprise terms.
5. Sovereign infrastructure lanes create owned product categories: SkyeMail for business email, CitadelDB for database, SkyeVault for files/repos/docs, and FS27 for billing/auth/gate telemetry.

The rule is non-negotiable: no plan should imply unlimited AI, unlimited storage, unlimited actions, or unlimited protected automation unless a signed enterprise contract and custom gate policy says so.

## Stack Ownership Map

| Lane | Sovereign stack | Outside replacement target | FS27 responsibility |
| --- | --- | --- | --- |
| Business OS | MetrAIyux 0S on its own VPS | Generic SaaS dashboards | Mirror every customer, workspace, billing, command, and action event |
| Payments | SkyePay with Stripe confirmation | Manual invoice-only activation | Unlock workspace after confirmed payment and write plan policy |
| Parent gate | SkyeGateFS27 | Loose API keys and unmetered provider calls | Auth, caps, model allowlists, usage gates, telemetry, pricing catalog |
| Database | CitadelDB | Neon/Postgres vendor dependency | Track whether tenant uses CitadelDB or external DB and enforce policy |
| Files/docs/repos | SkyeVault | Google Drive, GitHub storage, ad hoc folders | Track vault quota, file count, repo/document events, export ledger |
| Email | SkyeMail | Google Workspace/Gmail-only business email | Track mailbox provisioning, keys, send/receive surfaces, approval lane |
| AI | FS27 routed providers and future local/private models | Direct unmetered OpenAI/Gemini/Anthropic calls | Price, meter, cap, audit, and show margin |

## FS27 Big Brother Contract

The 0S must tell on itself. Every important action should become an event with enough context to answer:

- Who or what acted?
- Which workspace, customer, org, and lane did it touch?
- Was the action billable?
- Was it privileged or approval-sensitive?
- Did it use AI or protected automation?
- Which plan/cap/policy applied?
- What did it cost, if anything?
- Did it pass, fail, queue, unlock, or need attention?

FS27 stores the mirror as `PLATFORM_EVENT_MIRROR` audit rows and `platform.audit` gateway events. The 0S keeps its local audit log, then mirrors best-effort to FS27 when `FS27_EVENT_MIRROR_URL` is configured.

## CitadelDB Direction

Owners should be able to choose:

- CitadelDB as the sovereign database lane.
- Neon as the external managed Postgres lane.
- A migration path from Neon into CitadelDB when the owner wants more control.

0S should expose this as an owner/workspace provisioning choice, not as hidden infrastructure trivia. FS27 should track which database lane each workspace is using and surface it visually in Platform Control.

## SkyeVault Direction

SkyeVault should become the owner-controlled replacement for:

- Google Drive-style customer documents.
- GitHub-style repo and source package storage.
- Proof exports, handoff packs, vault key cards, and customer file rooms.

Vault quotas must remain plan-scoped and visible: storage MB/GB, file count, workspaces, repository/package events, and export actions.

## SkyeMail Direction

SkyeMail becomes the sovereign business email lane:

- Workspace mailbox provisioning.
- Key card and vault-passphrase setup.
- Customer/admin communication routing.
- Approval-sensitive sends.
- Future mail analytics and business inbox automation.

Email sends, mailbox provisioning, key events, and approval-sensitive actions should mirror to FS27.

## Go-Live Standard

Before this goes live, the public and admin surfaces must clearly show:

- Plan monthly price and setup fee.
- AI spend cap, RPM, RPD, devices, workspace count, storage, and file limits.
- Allowed provider/model lanes.
- AI billable rates and upstream cost basis.
- How MetrAIyux earns margin.
- Automatic unlock after confirmed SkyePay/Stripe payment.
- FS27 enforcement and telemetry.
- Sovereign stack choices: CitadelDB, SkyeVault, SkyeMail.

This document is the root vision pin. Outside tech can be pulled in later, but anything added should attach to this ownership map instead of creating another hidden dependency.
