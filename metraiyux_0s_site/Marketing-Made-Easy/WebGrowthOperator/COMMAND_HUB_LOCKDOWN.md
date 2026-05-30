# AE Command Hub Lockdown Instructions

The `/ae-command-hub/` and `/operator-playbook/` folders are internal pages. They include sales scripts, discovery prompts, compensation planning, objection handling, fulfillment SOPs, deliverables, reporting rules, and internal operating guidance.

## Included gate
This package does not define its own static Basic Auth lane. Live access belongs to the shared 0S FS27/SkyGate/Free99 owner gate.

## Real security note
Production access is not owned by Netlify. The live 0S deployment uses the Cloudflare Worker route plus the shared FS27/SkyGate auth lane for protected actions.

## Do not expose internally protected URLs
Do not link `/ae-command-hub/` or `/operator-playbook/` from public-facing service pages. They are excluded from public navigation, blocked in `robots.txt`, tagged with `X-Robots-Tag: noindex, nofollow`, and protected by the shared 0S gate.


## Contractor packet lockdown

The onboarding form now posts to the Cloudflare Worker endpoint `/api/marketing-made-easy/ae-vendor-onboarding/submit`. Sensitive payout fields and uploaded W-9/ID/agreement files are encrypted by the Worker before storage in Cloudflare KV. Packet submission creates a receipt and payout ledger only; external transfer remains blocked until owner/admin approval and a configured payout provider.
