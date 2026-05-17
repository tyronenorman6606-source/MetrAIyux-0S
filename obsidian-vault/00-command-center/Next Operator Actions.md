---
title: Next Operator Actions
brain: true
tags:
  - metraiyux
  - actions
  - operator
---

# Next Operator Actions

## Production Gates

- Choose final production domains for portal, control plane, Forgejo, public site, and proof surfaces.
- Set production DNS records and certificate email values.
- Confirm auth policy for protected admin and control routes.
- Add real Stripe price IDs, webhook secrets, and success/cancel URLs where billing is live.
- Confirm backup target and restore proof for commercial systems.

## Proof Gates

- Keep `PRODUCTION_READINESS_REPORT.md` updated when live surfaces, Worker versions, or blockers change.
- Run crawler proof after navigation, API, Cloudflare, or routing changes.
- Save proof receipts with clear date, route, result, and artifact links.

## Knowledge Gates

- Curate only stable, proof-safe notes into the local brain with `brain: true`.
- Run the repo-local Obsidian sync command after changing exported vault notes.
- Ask the local brain questions against the vault sync before using notes in public copy or client handoff.
