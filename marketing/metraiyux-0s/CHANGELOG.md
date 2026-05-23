# MetrAIyux 0S Marketing Changelog

## 2026-05-23

- Business Cards v2 is source-complete in `marketing/metraiyux-0s/business-cards.html`.
- The v2 card surface uses a 600px by 343px display wrapper, `scale(1.786)`, premium layered backgrounds, print isolation, QR generation, two founder cards, a Valley Verified client card, and twelve platform cards.
- The main marketing nav links to `business-cards.html`.
- Production deploy to `https://metraiyux-0s-marketing.pages.dev/business-cards.html` is blocked until a valid Cloudflare Pages deploy token is available. Live production still returns the older deployed card CSS (`scale(1.5)` / `504px`).
- Git is the current source of truth for Business Cards v2 until Cloudflare Pages credentials are repaired and a headed live-browser proof passes.
