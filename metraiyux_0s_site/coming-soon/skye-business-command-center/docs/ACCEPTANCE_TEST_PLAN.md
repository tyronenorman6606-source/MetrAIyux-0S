# Acceptance Test Plan

Use this plan before declaring a client deployment complete.

## Static hub checks
- Product page loads.
- Setup page loads.
- Dashboard loads.
- Command Center loads.
- Onboarding page loads.
- Handoff page loads.
- Launch page loads.
- Demo page loads.
- Proof page loads.
- Maintenance page loads.

## App checks
- FreeScout is reachable.
- EspoCRM is reachable.
- InvoiceShelf is reachable.
- Formbricks is reachable.

## Workflow checks
- Test email creates or reaches support mailbox.
- Test ticket can be assigned.
- Test CRM lead can be created.
- Test CRM lead can move stages.
- Test estimate or invoice can be created.
- Test intake form can be submitted.
- Client admin can log in.
- Backup runs and archive exists.

## Acceptance language
If a provider credential, DNS record, mailbox, or client decision is missing, mark the item blocked by client/provider input. Do not mark it complete.
