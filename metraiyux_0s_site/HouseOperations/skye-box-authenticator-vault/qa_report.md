# QA Report — SkyeBox Authenticator v3.0.0

## Passed locally

✅ `node proof/static_validation.mjs`

Validated that the inline app script and service worker parse, required v3 controls exist, no external HTTP/HTTPS runtime dependency exists, manifest version is v3.0.0, and the service worker cache is bumped.

✅ `node proof/totp_crypto_vector_test.mjs`

Validated RFC 6238-compatible SHA-1 TOTP vectors and AES-GCM encrypt/decrypt roundtrip behavior using Node WebCrypto.

✅ `node --check` on extracted inline app script.

✅ `node --check sw.js`.

✅ `manifest.json` parsed as valid JSON.

✅ PNG icon dimensions validated as square PWA icons.

✅ Static HTTP fetch check passed for `index.html`, `manifest.json`, and `sw.js` through a local Python server.

## Not completed in this container

☐ Full Chromium/Playwright click-through proof. The previous environment blocked Chromium launch with `ERR_BLOCKED_BY_ADMINISTRATOR`, so browser automation is not claimed here.

## Recommended live smoke after drop

1. Create a vault with a test password.
2. Add this test URI: `otpauth://totp/Example:test@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example`.
3. Confirm a 6-digit code appears and refreshes.
4. Export an encrypted backup.
5. Change the vault password.
6. Lock/unlock with the new password.
7. Import the exported backup and choose merge; enter the old backup password.
8. Confirm duplicates are warned/merged safely.
9. Test idle lock by setting the timer to 1 minute.

## v4 UI refresh validation
- CSS/markup refresh only. Core application logic was not rewritten in this pass.
- Confirmed `index.html` still contains the original application script and all existing element IDs used by the app logic.
- Confirmed JavaScript syntax remains valid after the UI refresh.

