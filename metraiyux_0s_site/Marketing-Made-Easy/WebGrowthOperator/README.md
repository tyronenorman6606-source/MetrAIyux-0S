# Skyes Over London LC — Managed Growth Operator Site

Netlify-ready static website package.

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

The internal hub and operator playbook are protected using Netlify Basic Authentication headers with temporary credentials. Replace the temporary passwords in `_headers` and `netlify.toml` before deployment.

## Internal protected routes

- `/ae-command-hub/`
- `/operator-playbook/`

These routes are excluded from `robots.txt`, tagged noindex/nofollow, and not linked from the public navigation.


## AE Contractor Onboarding + Payment Profile

This build includes a protected contractor onboarding lane under `/ae-command-hub/onboarding.html`. It collects independent-contractor profile information, agreement acceptance, W-9 upload, optional ID/agreement uploads, and a payout profile. The form posts to `/.netlify/functions/contractor-onboarding-submit` and saves a folder to Google Drive when configured.

Required Netlify environment variables:

- `GOOGLE_DRIVE_FOLDER_ID` — restricted parent folder for contractor packets.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — service account email with access to that Drive folder.
- `GOOGLE_PRIVATE_KEY` — service account private key, with newline characters preserved or escaped as `\n`.
- `CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64` — base64-encoded 32-byte key for AES-256-GCM encryption of payout details. Generate with: `openssl rand -base64 32`.

Security notes:

- Replace Basic Auth temporary values in `_headers` and `netlify.toml` before deploying.
- Restrict the Google Drive parent folder to owner/admin only.
- W-9 and payment data are sensitive tax/payment records. Do not share the Drive folder with AEs.
- Static Basic Auth is a useful deployment gate, but higher-risk production onboarding should eventually move behind real user accounts, audit logs, and a dedicated database/storage layer.


## Public Team Login button

The public navigation includes a `Team Login` button linking to `/ae-command-hub/`. This gives AEs/operators a clear entry point from the public website while keeping the hub behind Netlify Basic Auth. Replace temporary credentials before deployment.

## Contractor packet pages

Protected AE onboarding pages now include:

- `/ae-command-hub/onboarding.html` — browser onboarding form with uploads and payout profile fields.
- `/ae-command-hub/contracts.html` — contract/template download vault.
- `/ae-command-hub/payment-profile.html` — payout-method instructions and authorization notes.
- `/ae-command-hub/payout-register.html` — in-browser payout register with CSV export.
- `/ae-command-hub/classification-tax-notes.html` — IRS/DOL classification and tax-record guardrails.


## Drive + Netlify environment setup tutorial

Open `/ae-command-hub/setup-google-drive-env.html` after deploy/login for the step-by-step setup guide for:

- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64`

A Markdown copy is included at `SETUP_TUTORIAL_GOOGLE_DRIVE_ENV.md`.
