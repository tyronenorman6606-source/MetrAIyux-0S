# Business Cards v2 — Deploy Handoff
**Date:** 2026-05-23  
**Status:** Built locally, blocked on expired CF API tokens

---

## What's Done

Business cards v2 is fully rebuilt at:
`marketing/metraiyux-0s/business-cards.html`

Premium redesign with:
- 600×343px card display (up from 1.5× scale)
- Multi-layer backgrounds with grid texture, dual glow orbs, 4 corner marks, accent bar
- 2 personal cards (Gold founder + Cyan tech)
- 1 Valley Verified client card (live form, real-time update, QR code)
- 12 platform cards (MetrAIyux 0S, SkyeMusicNexus, SkyeRouteX, PHX Verified, NorthStar, Free99, LegalSkyes, QuantumSkyes, kAIxu, Agentic Growth, SkyeVaultOS, Merser)
- Print isolation: each card prints alone on 3.5"×2" page
- QR codes client-side via qrcode.js

Nav link added to `marketing/metraiyux-0s/index.html`.

**v1 is still live** at `https://metraiyux-0s-marketing.pages.dev/business-cards.html` (deployment `6e4ce0e3`)

---

## Deploy Blocker

All CF API token candidates in `.env` were reported as returning 401 or 403 during the business-card deploy attempt. Raw token values were intentionally removed from this handoff. Re-check the local `.env` token labels only; do not paste or commit tokens in docs.

The `skye-secret-rotation` worker auth works fine (`configured: true`) but can only manage Worker secrets, not deploy Pages, and can't expose its own internal token.

---

## How to Deploy Once You Have a Fresh CF Token

1. Go to **dash.cloudflare.com → My Profile → API Tokens** and create a new token with:
   - `Cloudflare Pages: Edit` permission on your account
   - OR use an existing token that has this permission

2. Provide the token through a local environment variable or an ignored local secrets file. Do not hardcode it in committed source:
   ```python
   CF_TOKEN = os.environ["CLOUDFLARE_API_TOKEN"]
   ```

3. Run:
   ```bash
   python3 cf_pages_deploy.py metraiyux-0s-marketing marketing/metraiyux-0s/
   ```

4. Update the ledger at `LIVE_DEPLOYMENT_LEDGER.md` with the new deployment ID and preview URL.

---

## Files Changed This Session

| File | Change |
|------|--------|
| `marketing/metraiyux-0s/business-cards.html` | Full v2 premium rebuild |
| `marketing/metraiyux-0s/index.html` | Added Business Cards nav link |
| `LIVE_DEPLOYMENT_LEDGER.md` | Added v1 deploy entry (needs v2 entry after deploy) |

---

## Live URLs

- **v1 (currently live):** https://metraiyux-0s-marketing.pages.dev/business-cards.html
- **v2 deploy target:** https://metraiyux-0s-marketing.pages.dev/business-cards.html (same URL, overwrites)
- **Pages project:** metraiyux-0s-marketing
- **Account ID:** e700b92580cd05de0104128efbd3e676
