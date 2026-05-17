# ConnectLog v6 Brand Integration Ledger

## Completed

✅ Integrated the approved ConnectLog logo into the real app package.

✅ Replaced root PWA icons with the approved ConnectLog logo art.

✅ Added optimized logo assets under `assets/` for app header, manifest, favicon, apple touch icon, and social preview use.

✅ Added a large animated hero logo stage with orbit treatment, glow, and reduced-motion safety through the existing media rule.

✅ Added a subtle branded watermark treatment to the exchange/profile card surface.

✅ Updated the generated share-card HTML styling to match the blue/orange ConnectLog brand energy without adding external dependencies.

✅ Bumped app version and service-worker cache to v6.0.0 so deployed clients refresh the branded build instead of staying pinned to the v5 cache.

## Still not claimed proven

☐ Live deployed PWA install icon rendering must be verified on the final host. Static checks confirm the manifest and files are present, but install prompts are browser/device specific.

☐ Mobile home-screen icon cropping must be checked on iOS and Android after deployment because each OS applies its own masking rules.
