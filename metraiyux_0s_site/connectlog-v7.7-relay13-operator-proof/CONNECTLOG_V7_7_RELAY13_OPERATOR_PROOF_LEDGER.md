# ConnectLog v7.7 Relay13 Operator Proof Ledger

## Scope
ConnectLog remains a standalone static/contact-card PWA. Relay13 remains a standalone messaging backend. This pass adds operator proof controls that make Relay13 setup easier without disabling local fallback.

## Added
- Relay13 operator runbook generator inside the Deployment Command Center.
- Local preflight checklist for origin, workspace, API key shape, active card, queue state, and no-fake-delivery status.
- Copyable bootstrap curl block.
- Copyable scoped API-key curl block.
- Copyable live-proof script/curl block.
- Redacted bridge config export/import.
- Diagnostics now include preflight output.

## Honest boundary
This does not prove a Cloudflare deployment by itself. Production proof still requires deployed Relay13 Worker, remote D1 migrations, workspace bootstrap, scoped API key, activation proof, message reload proof, and WebSocket browser proof.
