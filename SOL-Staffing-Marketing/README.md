# SOL Staffing Marketing

Marketing assets for the SOL Staffing OS package. Built in the same dark editorial sales style as `Metraiyux-Marketing`, but focused on the staffing platform we unpacked and upgraded.

## Files

| File | What It Is |
|---|---|
| `index.html` | Main public marketing landing page |
| `capabilities.html` | Technical/product capabilities reference |
| `sell-sheet.html` | B2B sell sheet with honest objection handling |
| `white-label.html` | Operator/white-label deployment program |
| `social-copy.md` | LinkedIn, X, email, ad, and short video copy |
| `valuation-brief.md` | Plain valuation and package-pricing brief |
| `style.css` | Shared design system adapted from the Metraiyux marketing site |
| `app.js` | Menu, reveal, and canvas interaction layer |
| `assets/screenshots/` | Actual captured SOL Staffing OS screenshots plus the Playwright-recorded browser workflow MP4 |
| `assets/proof/sol-video-proof-manifest.json` | Local receipt tying the homepage video to the unpacked source site, source recording, proof report, action path, and hashes |

## Proof Video

The homepage proof stage uses `assets/screenshots/sol-surface-reel.mp4`. That file is generated from a real Playwright `recordVideo` browser session against `../unpacked-projects/sol_staffing_agency_site`, not a slideshow of still screenshots. The source-of-truth receipt for that asset is now kept in `assets/proof/sol-video-proof-manifest.json`.

Recorded path: public homepage, employer intake submit, Skyegate FS27 session creation, authenticated admin dashboard, manual record creation, secure upload, authenticated brain endpoint request, and local SOL brain answer.

Source report:

- `/workspaces/MetrAIyux-0S/test-artifacts/sol-real-e2e-proof/sol-staffing-real-workflow-proof.json`

Local marketing receipt:

- `assets/proof/sol-video-proof-manifest.json`

Playback verification:

- `/workspaces/MetrAIyux-0S/test-artifacts/sol-marketing-redesign/mcp-final-browser-report.json`
- Desktop: `readyState` 4, `currentTime` 2.18, `paused` false, video visible
- Mobile: `readyState` 4, `currentTime` 1.86, `paused` false, video visible

Hashes:

- `assets/screenshots/sol-surface-reel.mp4`: `5309ac348b3aa98618e3370c191feb12be9bb2b191439d54bd2ca437aa6722d9`
- `/workspaces/MetrAIyux-0S/test-artifacts/sol-real-e2e-proof/sol-staffing-real-workflow-recording.webm`: `83dd58ea41412f55d53eaad6795071d7ef701d806775f962134ed503c4b35c72`

## Product Being Marketed

`../unpacked-projects/sol_staffing_agency_site`

Absolute workspace path:

`/workspaces/MetrAIyux-0S/unpacked-projects/sol_staffing_agency_site`

That package now includes Skyegate FS27 auth, Netlify Functions, records, secure uploads, admin dashboard, and live brain endpoint wiring.

## Deploy

This folder is static. Deploy it to Netlify, Cloudflare Pages, Vercel, or any static host. No build step.

Suggested domains:

- `staffing.soverlondon.com`
- `get.solstaffingos.com`
- `staffingos.skyesoverlondon.com`

## Copy Rules

1. Say exactly what works.
2. Say what requires environment activation.
3. Do not fake payroll, legal, HR, insurance, or government claims.
4. Sell the operating layer, not only the website.
