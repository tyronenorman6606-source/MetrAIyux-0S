# Security Policy — kAIxu CodeStudio Pro

## Summary
This application is designed to be an **offline-first** secure workspace with an optional executable backend bridge for provider workflows.
AI access is routed through the Kaixu Gateway and requires a user-provided key stored **encrypted at rest**.

## Data handling
- Workspace data is stored locally in **IndexedDB** on the user's device.
- The Kaixu Gateway key is stored **encrypted at rest** (AES-256-GCM via WebCrypto).
- Passphrases are **never stored**.
- Optional workspace encryption can be enabled, sealing the workspace JSON at rest.

## Threat model (high level)
### Defended against
- Accidental secret leakage into persistent storage (best-effort redaction + encrypted vault).
- XSS-by-default patterns (no innerHTML in main app; strict CSP; no inline scripts/styles).
- Clickjacking (frame-ancestors none on main app).
- Remote script injection (no external dependencies).

### Not defended against
- Device compromise (malware/OS-level compromise can read memory while vault is unlocked).
- Physical access attacks without full-disk encryption.
- User intentionally pasting secrets into code files or chat prompts.

## Sandbox runner
- Code execution occurs in a sandboxed iframe host.
- Network access from the sandbox is blocked by CSP.
- Logs are streamed back via postMessage to the terminal.

## Reporting
If you find a security issue, create a private report through SOLEnterprises security channels.


## Backend bridge CSP note

The Platform Console can call a local executable backend at `http://localhost:7137` / `http://127.0.0.1:7137` when running the included Node platform engine. Production deployments should replace that with the hosted backend origin and remove local origins if not needed.
