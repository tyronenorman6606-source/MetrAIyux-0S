---
title: Skyes Over London LC Proof Atlas Receipt - 2026-05-17
brain: true
tags:
  - proof
  - skyes-over-london
  - mcp
  - vault
---

# Skyes Over London LC Proof Atlas Receipt - 2026-05-17

## Summary

Skyes Over London LC public site was unpacked from the deployment archive, deep-scanned, renamed back to the company identity, redesigned as an editorial proof atlas, audited through the local QuantumSkyes MCP, and browser-checked on desktop/mobile.

## Local Surface

- Site folder: `metraiyux_0s_site/_platform-sources/skyes-over-london-lc/`
- Homepage: `metraiyux_0s_site/_platform-sources/skyes-over-london-lc/index.html`
- Contact route: `metraiyux_0s_site/_platform-sources/skyes-over-london-lc/pages/contact.html`
- MCP receipt: `metraiyux_0s_site/_platform-sources/skyes-over-london-lc/MCP_TOOLING_RECEIPT.json`
- Direct MCP receipt artifact: `test-artifacts/direct-mcp/skyes-over-london-lc-mcp-tooling-receipt.json`

## Browser QA

- Desktop homepage: `test-artifacts/skyes-over-london-lc/desktop-home.png`
- Mobile homepage: `test-artifacts/skyes-over-london-lc/mobile-home.png`
- Desktop contact: `test-artifacts/skyes-over-london-lc/desktop-contact.png`
- Mobile contact: `test-artifacts/skyes-over-london-lc/mobile-contact.png`

## MCP Result

- Command: `npm run mcp:mine -- metraiyux_0s_site/_platform-sources/skyes-over-london-lc`
- Result: `ok: true`
- Failed MCP calls: `[]`
- Design direction: `editorial-proof-atlas` with company-attached public proof language.

## Vault Package

- Stage folder: `.skyevault-out/stage-skyes-over-london-lc-20260517/`
- Archive: `.skyevault-out/skyes-over-london-lc-proof-atlas-20260517T092216Z.zip`
- SHA-256: `b608894ced56388c87ad174c5c38551e431e353ea6d6ed9d6af3e777bdf8b615`
- SkyeVault receipt: `cdv_3beaaa13277b546bf509f73b`
- SkyeVault session: `cdv_ffa2057639caef4cbced83bb991b0e9ae61d`
- SkyeVault destination: `Primary Production Intake`
- Note: `login.html` was excluded from the vault package because the SkyeVault scanner flagged it as containing a Google API key pattern.

## Git Base

- Base commit before this receipt: `bd6ebb3`
