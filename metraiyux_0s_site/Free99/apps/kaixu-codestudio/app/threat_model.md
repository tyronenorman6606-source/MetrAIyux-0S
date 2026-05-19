# Threat Model — kAIxu CodeStudio Pro

## Assets
- Kaixu Gateway sub-key (high sensitivity)
- Workspace file contents (medium to high sensitivity)
- Audit log and chat history (medium sensitivity)

## Primary attack surfaces
- DOM injection/XSS
- Local storage exfiltration
- Sandbox escape attempts from executed code
- Network interception of AI requests (mitigated by TLS)

## Controls
- Main-app CSP prohibits inline scripts/styles and eval.
- No innerHTML usage in the main app; DOM is built using safe node APIs.
- Vault encryption (AES-256-GCM) with PBKDF2 key derivation.
- Optional workspace encryption at rest.
- Sandbox runner is isolated via iframe sandbox and network-blocking CSP.
- Local audit logging with secret redaction.

## Residual risk
- Vault key exists in memory while unlocked.
- If the device/browser profile is compromised, attackers may access local data.
