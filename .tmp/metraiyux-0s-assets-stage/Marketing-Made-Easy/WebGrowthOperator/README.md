# Skyes Over London LC — Managed Growth Operator Site

Cloudflare-mounted static website package for the MetrAIyux 0S full-system Worker.

## Structure
- `index.html`: public homepage
- `services/`: public service catalog and service detail pages
- `pricing.html`: master pricing table
- `process.html`: delivery workflow
- `client-intake.html`: FormSubmit intake form routed to B2B@solenterprises.org
- `operator-playbook/`: internal SOP pages for fulfillment
- `assets/`: Skyes Over London logo
- `css/svs.css`: shared Skyes Visual Standard styling
- `js/site.js`: shared UI behavior

## Deployment note
The operator playbook folder is marked noindex and excluded from public navigation, but static hosting is not access control. Put that folder behind authentication or move it to a private workspace before public launch.


## Final pass: AE Command Hub

This build now includes `/ae-command-hub/`, a password-protected internal sales command hub for account executives. It includes:

- sales scripts by service lane
- AE compensation plan and earnings estimator
- discovery questions
- offer matching matrix
- objection handling
- follow-up cadences
- close scripts
- AE rules and compliance guardrails
- AE compensation plan, earnings examples, payout rules, activity targets, and recruiting script

The internal hub and operator playbook are production-mounted behind the shared FS27/SkyGate auth lane on the 0S Cloudflare Worker. Legacy `_headers` and `netlify.toml` files remain only as source-package history and must not be treated as the production gate.

## Internal protected routes

- `/ae-command-hub/`
- `/operator-playbook/`

These routes are excluded from `robots.txt`, tagged noindex/nofollow, and not linked from the public navigation.


## AE Contractor Onboarding + Payment Profile

This build includes a protected contractor/vendor onboarding lane under `/ae-command-hub/onboarding.html`. It collects independent-contractor profile information, agreement acceptance, W-9 upload, optional ID/agreement uploads, and a payout profile. The form posts to `/api/marketing-made-easy/ae-vendor-onboarding/submit` on the 0S Cloudflare Worker and stores encrypted packet records in Cloudflare KV.

Required Cloudflare Worker bindings/secrets:

- `SITE_EVENTS_KV` — Cloudflare KV namespace bound in `metraiyux_0s_site/wrangler.toml`.
- `AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64` — base64-encoded 32-byte key for AES-GCM encryption of payout details and uploaded files. Generate with: `openssl rand -base64 32`.
- Shared FS27/SkyGate session or admin token — required for protected packet submission and packet reads.

Security notes:

- Do not commit the encryption key.
- W-9 and payment data are sensitive tax/payment records. The live Worker stores them encrypted and keeps payout release ledger-only until owner/admin approval.
- External ACH, Stripe, PayPal, Cash App, or check payments are not created by packet submission. Money movement stays gated behind owner approval and payout-provider setup.


## Public Team Login button

The public navigation includes a `Team Login` button linking to `/ae-command-hub/`. This gives AEs/operators a clear entry point from the public website while keeping the protected actions behind the shared FS27/SkyGate auth lane.

## Contractor packet pages

Protected AE onboarding pages now include:

- `/ae-command-hub/onboarding.html` — browser onboarding form with uploads and payout profile fields.
- `/ae-command-hub/contracts.html` — contract/template download vault.
- `/ae-command-hub/payment-profile.html` — payout-method instructions and authorization notes.
- `/ae-command-hub/payout-register.html` — in-browser payout register with CSV export.
- `/ae-command-hub/classification-tax-notes.html` — IRS/DOL classification and tax-record guardrails.


## Cloudflare packet vault setup tutorial

Open `/ae-command-hub/setup-google-drive-env.html` after deploy/login for the step-by-step setup guide for:

- `SITE_EVENTS_KV`
- `AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64`
- shared FS27/SkyGate protected access

A Markdown copy is included at `SETUP_TUTORIAL_GOOGLE_DRIVE_ENV.md`.
