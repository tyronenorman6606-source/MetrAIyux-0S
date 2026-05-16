# Resend Approval Email Upgrade Manifest

Generated: 2026-05-15T09:39:35Z

## Added
- Resend approval notification support in `cloudflare-admin-automation-worker/src/worker.js`.
- New Worker endpoint: `POST /api/admin/approval-email/test`.
- Resend variables in `cloudflare-admin-automation-worker/wrangler.toml`.
- Migration: `0002_resend_approval_notifications.sql`.
- Admin Approval Inbox: `admin/approval-inbox.html` and `admin/approval-inbox.js`.
- Resend setup page: `admin/resend-notifications.html`.
- Tutorial lesson 16: `admin/tutorial/16-resend-approval-emails.html`.
- Download templates for Resend setup and approval inbox operations.

## Approval email triggers
- Chat commands that require approval.
- Social drafts queued for approval.
- Tasks marked `approval_required` or `requires_approval`.

## Required live configuration
- `ADMIN_TOKEN` Worker secret.
- `RESEND_API_KEY` Worker secret.
- `RESEND_FROM_EMAIL` Worker var.
- `ADMIN_APPROVAL_EMAIL` Worker var.
- `PUBLIC_ADMIN_URL` Worker var.

## Honest status
The package now has code and pages for live Resend approval notifications. Emails send only after the Cloudflare Worker is deployed with real Resend credentials and a verified sending domain.
