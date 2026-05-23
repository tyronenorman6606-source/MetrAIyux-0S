# HouseOperations + SkyeBox Expansion Manifest

Generated: 2026-05-17

## Added

- `HouseOperations/skye-box-authenticator-vault/` - extracted SkyeBox Authenticator Vault PWA.
- `live/houseoperations-skyebox-operator-proof.html` - 0S expansion hub.
- `proof/houseoperations-skyebox-expansion-receipt.html` - source and browser proof receipt.
- `tests/houseoperations-skyebox-e2e.mjs` - browser workflow proof for HouseOperations and SkyeBox, including WebM recording and playback verification.

## Corrected

- SkyeBox service worker cache entries now match the extracted lowercase proof filenames.
- The original zip archive was removed after integrity verification and extraction.

## Commercial Decision

Base 0S plan rates are held in this pass. The plan scope now reflects HouseOperations and SkyeBox:

- Starter: local operator lane and one local vault handoff.
- Growth: one HouseOperations workspace and three operator vault instances.
- Autonomous: three HouseOperations workspaces and eight operator vault instances.
- Enterprise: custom HouseOperations and SkyeBox custody policy under written terms.

## Boundary

SkyeBox is local-first. It does not provide cloud sync, server-side recovery, managed secret custody, or enterprise credential compliance by itself. HouseOperations is static-local unless a later Worker/D1/KV persistence phase is scoped and proven.
