# Live Staffing OS Upgrade

This package is no longer only a static front end. It now includes a Netlify-backed operating layer for authenticated internal pages, record capture, secure uploads, admin review, and a live GPU/Ollama brain endpoint.

## Added

- `netlify/edge-functions/auth-gate.js` protects internal operator pages before they render.
- `staffing-login.html` exchanges a Skyegate FS27 token for an HttpOnly staffing session.
- `admin-dashboard.html` shows live record counts, database records, secure file uploads, manual record creation, and private live brain access.
- `netlify/functions/staffing-submit.js` converts site forms into server-side records.
- `netlify/functions/staffing-records.js` provides authenticated admin CRUD-lite record access.
- `netlify/functions/staffing-files.js` stores and downloads authenticated documents.
- `netlify/functions/brain.js` calls a real Ollama or OpenAI-compatible GPU endpoint when configured.
- `script.js` now submits public and internal forms to the staffing record backend.

## Required Environment

Set at least one Skyegate introspection URL:

- `SKYGATE_FS27_INTROSPECT_URL`
- or `SKYEGATE_FS27_INTROSPECT_URL`
- or `SKYGATE_INTROSPECT_URL`
- or `SKYEGATE_INTROSPECT_URL`

Optional auth settings:

- `SKYGATE_FS27_LOGIN_URL` or `SKYEGATE_FS27_LOGIN_URL`
- `SOL_STAFFING_ADMIN_ROLES=owner,admin,operator`
- `SOL_STAFFING_SESSION_SECONDS=28800`
- `SOL_STAFFING_DEV_TOKEN` for local-only smoke testing

Optional live brain settings:

- Ollama: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, optional `OLLAMA_API_KEY`
- OpenAI-compatible GPU/vLLM: `GPU_BRAIN_ENDPOINT`, `GPU_BRAIN_MODEL`, optional `GPU_BRAIN_API_KEY`

## Storage

On Netlify, records and uploaded file payloads use Netlify Blobs through `@netlify/blobs`. Locally, functions fall back to `.staffing-db/` for smoke testing.

## Production Notes

The upload function validates file type and size, requires Skyegate-authenticated admin access, stores metadata separately from payloads, and records audit entries. Before collecting regulated onboarding, payroll, I-9, medical, background-check, or tax documents, configure retention, access review, legal/compliance review, and incident-response handling.
