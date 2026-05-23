# SkyeSecure External Cryptography Audit RFP

This document is the external audit request packet for SkyeSecure Secret Packs. It is written for an independent security reviewer or audit firm. It must not be treated as completed audit evidence until the reviewer issues their own signed report.

## Product

SkyeSecure Secret Packs creates and restores `.skyesecrets` encrypted developer handoff files for secrets and local-only project state that cannot be committed to Git or stored in normal plaintext archives.

## Audit Scope

Review these implementation files:

- `packages/skye-secure/skye-secure-core.mjs`
- `tools/skye-secure-packs.mjs`
- `tools/skye-secure-platform.mjs`
- `tools/skye-secure-audit-bundle.mjs`
- `tools/skyevault-repo-push.mjs`
- `metraiyux_0s_site/assets/skye-secure-app.js`
- `metraiyux_0s_site/skye-secure-secret-packs/app.html`
- `metraiyux_0s_site/assets/skye-secure-platform.js`
- `metraiyux_0s_site/skye-secure-platform/index.html`
- `tests/skye-secure-packs-smoke.mjs`
- `tests/skye-secure-unlocker-browser-proof.mjs`
- `tests/skye-secure-platform-proof.mjs`
- `docs/SKYE_SECURE_SECRET_PACKS.md`

Review these generated evidence files:

- `test-artifacts/skye-secure-e2e/proof-report.json`
- `test-artifacts/skye-secure-browser-proof/browser-report.json`
- `test-artifacts/skye-secure-platform-proof/platform-proof-report.json`
- `test-artifacts/skye-secure-audit/latest-audit-bundle.json`
- `test-artifacts/skye-secure-audit/latest-auditor-packet.md`

## Questions For The Auditor

1. Does the SKYESEC2 envelope authenticate every public and encrypted field that must be protected from tampering?
2. Is AES-GCM used correctly across Node and browser runtimes, including nonce size, tag handling, and additional authenticated data?
3. Are content keys generated, wrapped, and separated correctly?
4. Is the PBKDF2 passphrase wrapping model acceptable for the stated threat model?
5. Does optional pepper handling reduce risk without creating misleading recovery promises?
6. Is X25519 plus HKDF used correctly for public-key recipient wrapping?
7. Do path validation and restore protections prevent traversal, overwrite surprise, and unsafe extraction?
8. Can public manifests, receipts, and audit bundles leak sensitive values or path data beyond the intended disclosure model?
9. Does the browser packer create packs that are cryptographically compatible with the Node verifier and restore path?
10. Do platform inventory, search, access policy, audit, offload, and reload flows avoid plaintext leakage?
11. Are revocation, grant, and rotation semantics documented honestly?

## Required Auditor Deliverables

- Signed audit report with reviewer identity, date, version, scope hash, and methodology.
- Findings table with severity, exploitability, affected files, and recommended fixes.
- Confirmation of tests run and any additional custom tests.
- Clear statement of whether SkyeSecure may claim “independently reviewed” or “third-party audited.”
- Explicit exclusions and residual risk.

## Commands For Reviewer

```bash
npm run skye-secure:test
npm run skye-secure:platform-proof
npm run skye-secure:audit
```

Optional manual flows:

```bash
npm run vault:secrets:manifest
npm run skye-secure -- help
npm run skye-secure -- inspect --pack=test-artifacts/skye-secure-e2e/client-passphrase.skyesecrets
```

## Expected Proof Signals

- `npm run skye-secure:test` exits `0`.
- `npm run skye-secure:platform-proof` exits `0`.
- `test-artifacts/skye-secure-e2e/proof-report.json` has `ok: true`.
- `test-artifacts/skye-secure-browser-proof/browser-report.json` has `ok: true`.
- `test-artifacts/skye-secure-platform-proof/platform-proof-report.json` has `ok: true`.
- `npm run skye-secure:audit` exits `0`.
- `test-artifacts/skye-secure-audit/latest-audit-bundle.json` reports:
  - `automatedProofOk: true`
  - `syntaxOk: true`
  - `proofReportsOk: true`
  - `npmAuditZeroKnownVulnerabilities: true`
  - `externalCryptoAuditStillRequired: true`

## Signoff Rule

Until the independent reviewer returns a signed report, product copy may say:

```text
SkyeSecure has in-repo automated proof, adversarial tamper tests, browser/Node interoperability proof, and an audit handoff bundle prepared for external review.
```

Product copy must not say:

```text
SkyeSecure is third-party audited.
```
