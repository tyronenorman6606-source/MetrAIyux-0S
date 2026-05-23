# MetrAIyux 0S Marketing Changelog

## 2026-05-23

- LegalSkyes policy-route correction is deployed: Legal Center links now point to `https://skyes-over-london-legal.pages.dev/legal/` instead of the broken `https://solenterprises.org/legal/` path, and Marketplace Policy links point to `https://skyes-over-london-legal.pages.dev/legal/marketplace-commerce/`.
- Cloudflare Pages deployments: LegalSkyes `56a9197d-6113-470e-8411-63d94a9cb730`, MetrAIyux marketing `14855f13-5688-4de8-a86d-665c561823ad`, and Gray portfolio mirror `e09e7995-ebe9-404a-aee2-e03db06ef678`.
- Public surfaces corrected: marketing homepage footer, marketing marketplace Legal Center card/footer, marketing ecosystem footer, Business Cards LegalSkyes platform card display/QR, Gray portfolio marketplace Legal Center card/footer, and Gray portfolio ecosystem footer.
- Headed live-browser proof passed desktop `1440x980` and mobile `390x844`, including LegalSkyes hub/policy pages, marketing/Gray public links, popup target checks, full-page scroll proof, screenshot receipts, zero stale SOLE legal links, and zero failures. Receipt: `test-artifacts/live-browser-verifier/2026-05-23T03-04-19-649Z-legal-skyes-policy-routes/live-browser-verification-report.json`.

- Business Cards were overwritten with the new founder-branded Client Access Studio at `https://metraiyux-0s-marketing.pages.dev/business-cards.html`.
- Cloudflare Pages deployment `ac63a830-4a79-476a-93d2-9ce120e2578a` is the corrected live version after the owner requested real founder photos/logos and no inflated Valley Verified business-count claims; preview: `https://ac63a830.metraiyux-0s-marketing.pages.dev`.
- The new studio ships 3 founder card directions using the local Gray London Skyes portrait/headshot/cutout plus the real Skye Over London and MetrAIyux 0S logo assets, a selected-client Valley Verified priority-access card builder with live business/city/category/contact fields, client-specific priority codes, QR codes that open a prefilled direct email, and 12 platform cards rendered from structured data.
- The browser actions are now `Save PDF`, `Print Card`, `Print Full Set`, and `Print Platform Set`; each card still prints at standard 3.5in by 2in size through the browser print/PDF dialog.
- Headed live-browser proof passed desktop `1440x980` and mobile `390x844`, including Valley Verified edits, four print-button interactions, QR canvas pixel checks, founder/logo image load checks, full-page scrolling, screenshots, zero console errors, and zero failed requests. Receipt: `test-artifacts/live-browser-verifier/2026-05-23T02-38-26-557Z-business-cards-v2-production-focused/live-browser-verification-report.json`.

- Business Cards v2 is deployed live at `https://metraiyux-0s-marketing.pages.dev/business-cards.html`.
- Cloudflare Pages deployment `f8e8b6e0-2077-42a9-a757-28f191a52cf3` refreshed production from `marketing/metraiyux-0s/`; preview: `https://f8e8b6e0.metraiyux-0s-marketing.pages.dev`.
- The v2 card surface uses a 600px by 343px desktop display wrapper, responsive mobile fitting through `--screen-scale`, premium layered backgrounds, print isolation, local QR generation, two founder cards, a Valley Verified client card, and twelve platform cards.
- The main marketing nav links to `business-cards.html`.
- QR generation no longer depends on the external unpkg CDN; production serves `assets/vendor/qrcode-generator.js` locally.
- Headed live-browser proof passed desktop `1440x980` and mobile `390x844`, including Valley Verified form edits, four print-button interactions, QR canvas pixel checks, full-page scrolling, screenshots, zero console errors, and zero failed requests. Receipt: `test-artifacts/live-browser-verifier/2026-05-23T01-56-21-087Z-business-cards-v2-production-focused/live-browser-verification-report.json`.
