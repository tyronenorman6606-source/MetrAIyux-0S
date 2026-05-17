---
title: Production Blockers
brain: true
tags:
  - production
  - blockers
  - deployment
---

# Production Blockers

## Citadel Forge

Citadel Forge is locally stood up with Postgres, Forgejo, control plane, and portal containers. Production push is blocked by external account and deployment decisions:

- Real domains for portal, control, and Forgejo.
- DNS pointed at the production server.
- ACME email for HTTPS certificates.
- Production auth decision.
- Stripe price IDs and webhook setup.
- Forgejo runner registration token and workflow proof.
- Offsite backup target and restore proof.

## Client Drop Vault

Client Drop Vault checks and smoke pass locally. Live upload proof is blocked by Google Drive service-account quota unless a Shared Drive, user-owned folders, or domain-wide delegation is configured.

## Node OS

Node OS prep passed local checks, but full ISO build and boot proof need a host with enough disk for the NixOS ISO closure, recommended 30 to 50 GB free.

## SkyeGateFS27

SkyeGateFS27 is the auth and gateway authority for the ecosystem. Production hardening depends on explicit CORS origins, admin auth policy, billing credentials if top-ups are active, rate limit settings, and stable deployment path.
