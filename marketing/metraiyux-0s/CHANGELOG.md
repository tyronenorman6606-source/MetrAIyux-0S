# MetrAIyux 0S Marketing Changelog

## 2026-05-23

- Business Cards v2 is deployed live at `https://metraiyux-0s-marketing.pages.dev/business-cards.html`.
- Cloudflare Pages deployment `f8e8b6e0-2077-42a9-a757-28f191a52cf3` refreshed production from `marketing/metraiyux-0s/`; preview: `https://f8e8b6e0.metraiyux-0s-marketing.pages.dev`.
- The v2 card surface uses a 600px by 343px desktop display wrapper, responsive mobile fitting through `--screen-scale`, premium layered backgrounds, print isolation, local QR generation, two founder cards, a Valley Verified client card, and twelve platform cards.
- The main marketing nav links to `business-cards.html`.
- QR generation no longer depends on the external unpkg CDN; production serves `assets/vendor/qrcode-generator.js` locally.
- Headed live-browser proof passed desktop `1440x980` and mobile `390x844`, including Valley Verified form edits, four print-button interactions, QR canvas pixel checks, full-page scrolling, screenshots, zero console errors, and zero failed requests. Receipt: `test-artifacts/live-browser-verifier/2026-05-23T01-56-21-087Z-business-cards-v2-production-focused/live-browser-verification-report.json`.
