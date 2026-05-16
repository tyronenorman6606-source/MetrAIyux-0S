# ADMIN AUTOMATION SITE UPGRADE MANIFEST

Generated: 2026-05-15T09:29:26Z

This upgrade adds an admin-facing Main Automation Brain designed to run the business command layer from a chat-style interface.

## Key files

- `admin/index.html`
- `admin/automation-brain.html`
- `admin/tutorial/index.html`
- `admin/tutorial/*.html`
- `admin/social-autopilot.html`
- `admin/automation-policy.html`
- `admin/brain-command-matrix.html`
- `admin/admin-launch-checklist.html`
- `admin/admin-brain-chat.js`
- `admin/admin-brain.css`
- `brain/automation-brain.json`
- `cloudflare-admin-automation-worker/src/worker.js`
- `cloudflare-admin-automation-worker/migrations/0001_admin_automation_schema.sql`
- `cloudflare-admin-automation-worker/wrangler.toml`
- `cloudflare-admin-automation-worker/README.md`

## Operational status

Browser-local admin brain works inside the static site.
Cloudflare Worker kit is included for persistent shared automation.
Live posting requires real social connector credentials and admin approval settings.
