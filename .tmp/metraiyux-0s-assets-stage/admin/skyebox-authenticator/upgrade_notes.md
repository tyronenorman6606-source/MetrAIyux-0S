# Upgrade Notes — v3.0.0

This continuation pass upgrades the prior encrypted PWA into a stronger local vault rather than a visual-only revision.

## Implemented

✅ Master password rotation with real re-encryption.
✅ Encrypted-backup merge flow.
✅ Device-local wipe with typed confirmation.
✅ Configurable idle lock timer.
✅ Best-effort clipboard clearing.
✅ Copy otpauth URI per account.
✅ Duplicate token warning.
✅ Stronger PBKDF2 iteration target for v3 vaults.
✅ CSP/referrer hardening.
✅ Service worker cache version bump.
✅ Local static/proof scripts included under `proof/`.

## Compatibility

Existing v2 encrypted vaults remain supported. On successful unlock, old records are upgraded to the v3 vault envelope and stronger KDF settings using the same password.

## Still not claimed

☐ Full browser click automation was not completed in this container.
☐ Cross-device sync is not included.
☐ Hardware-backed passkey unlock is not included.
☐ QR scanning still depends on browser BarcodeDetector support.

## v4 UI refresh
- Reworked the visual system into a cleaner dark workspace UI.
- Re-styled the authentication view, dashboard, token cards, side panels, modals, and mobile layout.
- Left encryption, vault, backup, scanning, and TOTP generation logic intact.
- No new runtime dependencies were added.

