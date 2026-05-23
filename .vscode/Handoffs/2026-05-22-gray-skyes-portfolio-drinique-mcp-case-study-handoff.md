# Gray Skyes Portfolio Drinique MCP Case Study Handoff

Date: 2026-05-22

## Current Status

The Gray Skyes founder portfolio has been updated with a Drinique client-build case study that shows one customer across three production surfaces:

- Hand-built Base
- SKRUCIBLE Variant
- Merser Variant

The portfolio project `gray-skyes-founder-portfolio` was missing from the Cloudflare Pages account when closure work resumed, even though the old ledger referenced it. I recreated the Pages project through the Cloudflare API and deployed the corrected portfolio bundle.

Important: the required headed live-browser gate has **not** passed yet. HTTP production checks pass, and the live HTML contains the Drinique section, but the headed Playwright proof was interrupted/failed on lifecycle wait timeouts. Do not mark the portfolio update as fully production-ready until the browser proof is rerun and passes.

## Live URLs

Portfolio:

- `https://gray-skyes-founder-portfolio.pages.dev/`
- `https://gray-skyes-founder-portfolio.pages.dev/skyeknowlogy/`
- `https://gray-skyes-founder-portfolio.pages.dev/skyeknowology/`

Drinique comparison sites:

- `https://drinique-mcp-comparison.pages.dev/base/`
- `https://drinique-mcp-comparison.pages.dev/skrucible/`
- `https://drinique-mcp-comparison.pages.dev/merser/`

## Deployment Record

Latest portfolio deployment:

- Project: `gray-skyes-founder-portfolio`
- Canonical URL: `https://gray-skyes-founder-portfolio.pages.dev/`
- Deployment ID: `85623c18-1dfa-4d55-83c5-89eb13ca6e18`
- Preview URL: `https://85623c18.gray-skyes-founder-portfolio.pages.dev`
- Branch: `main`
- Asset count: `175`
- Deploy receipt: `test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-deploy-receipt.json`
- Manifest: `test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-manifest.json`

The deploy was done with the direct Cloudflare Pages asset-upload path, not Wrangler's full deploy path. Wrangler was hanging in this workspace.

## HTTP Verification Completed

Fresh HTTP checks returned `200`:

- Portfolio root: `200`, Drinique case study visible.
- `/skyeknowlogy/`: `200`, Drinique case study visible.
- `/skyeknowology/`: `200`, Drinique case study visible.
- Drinique Base: `200`.
- Drinique SKRUCIBLE: `200`.
- Drinique Merser: `200`.

The production HTML contains:

- `Drinique: one business, three production surfaces.`
- `Detailed Drinique MCP tech stack`
- `Merser MCP4`
- `Client Builds`

## Browser Gate Status

Not passed yet.

Failed/partial browser proof receipt:

- `test-artifacts/gray-skyes-portfolio-drinique-update/live-proof/live-browser-report.json`

Observed proof issues:

- First proof failed because `Detailed Drinique MCP tech stack` existed only as an `aria-label`, not visible text.
- I fixed that by adding a visible `<h3 class="case-subhead">Detailed Drinique MCP tech stack</h3>`.
- Later proof attempts hit Playwright lifecycle timeouts waiting for `domcontentloaded` on live Pages URLs, even while HTTP fetches showed the pages serving quickly.

Recommended next proof-script fix:

- In `test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs`, switch root and route `page.goto(...)` calls from `waitUntil: "domcontentloaded"` to `waitUntil: "commit"`.
- Keep the visible-text assertions and screenshots as the real proof of render.
- The external Drinique links should also use `waitUntil: "commit"` and then assert visible `Drinique` text.

Suggested proof command:

```bash
XDG_CONFIG_HOME=/tmp/gray-skyes-portfolio-xdg \
PLAYWRIGHT_BROWSERS_PATH=/home/codespace/.cache/ms-playwright \
timeout 240s xvfb-run -a \
node test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs
```

Do not present the live links as browser-verified until that receipt returns `ok: true`.

## Source Files Changed

Primary portfolio source:

- `marketing/gray-skyes-canonical-site/skyeknowology.html`

Supporting/alternate portfolio route:

- `marketing/gray-skyes-canonical-site/portfolio.html`
- `marketing/gray-skyes-canonical-site/canonical.css`

Staged deploy bundle:

- `test-artifacts/gray-skyes-portfolio-drinique-update/deploy/`

Deploy/proof scripts:

- `test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-deploy.mjs`
- `test-artifacts/gray-skyes-portfolio-drinique-update/live-browser-proof.mjs`

## Portfolio Content Added

Added a `Client Builds` navigation item and hero CTA.

Added section:

- ID: `client-builds`
- Headline: `Drinique: one business, three production surfaces.`
- Copy explains that Drinique was selected as a restaurant-type Valley Verified business, then built as a hand-made base and two MCP-driven variants.

Case cards:

- Hand-built Base
- SKRUCIBLE Variant
- Merser Variant

Proof metrics shown in portfolio:

- Routes: `8`
- Interactions: `102`
- Assertions: `30`
- Screenshots: `32`
- Console failures: `0`
- Network failures: `0`

## Tech Stack Presented In Portfolio

Hand-built Base:

- HTML5
- CSS Grid
- Canvas 2D
- Vanilla JS
- Clipboard API
- Cloudflare Pages

SKRUCIBLE Variant:

- SKRUCIBLE MCP
- Forge Palette
- Motion CSS
- IntersectionObserver
- Canvas FX
- Proof QA

Merser Variant:

- Merser MCP4
- Room Contract
- Pointer Events
- Iframe Source Room
- Drawer UI
- Playwright Proof

Portfolio/deployment stack:

- Static HTML/CSS portfolio route
- Responsive CSS Grid/Flexbox
- CSS custom properties
- Cloudflare Pages
- Direct Pages asset upload API
- BLAKE3 asset hashing matching Wrangler internals
- `_redirects` for `/skyeknowlogy` and `/skyeknowology`
- Headed Chromium/Xvfb proof script

Skillset language now visible:

- Client discovery
- Design systems
- MCP integration
- Static site architecture
- Interactive UI
- Cloudflare Pages
- Browser QA
- Production handoff

## Deployment Commands Used

Stage bundle:

```bash
stage='test-artifacts/gray-skyes-portfolio-drinique-update/deploy'
rm -rf "$stage"
mkdir -p "$stage"
cp -R marketing/gray-skyes-canonical-site/. "$stage/"
cp marketing/gray-skyes-canonical-site/skyeknowology.html "$stage/index.html"
mkdir -p "$stage/skyeknowlogy" "$stage/skyeknowology"
cp marketing/gray-skyes-canonical-site/skyeknowology.html "$stage/skyeknowlogy/index.html"
cp marketing/gray-skyes-canonical-site/skyeknowology.html "$stage/skyeknowology/index.html"
printf '/skyeknowlogy /skyeknowlogy/index.html 200\n/skyeknowlogy/ /skyeknowlogy/index.html 200\n/skyeknowology /skyeknowology/index.html 200\n/skyeknowology/ /skyeknowology/index.html 200\n' > "$stage/_redirects"
```

Deploy:

```bash
node test-artifacts/gray-skyes-portfolio-drinique-update/direct-pages-deploy.mjs
```

HTTP spot check:

```bash
for url in \
  https://gray-skyes-founder-portfolio.pages.dev/ \
  https://gray-skyes-founder-portfolio.pages.dev/skyeknowlogy/ \
  https://gray-skyes-founder-portfolio.pages.dev/skyeknowology/ \
  https://drinique-mcp-comparison.pages.dev/base/ \
  https://drinique-mcp-comparison.pages.dev/skrucible/ \
  https://drinique-mcp-comparison.pages.dev/merser/
do
  curl -L --max-time 25 -sS -o /tmp/handoff-check.html -w '%{http_code} %{time_total} %{url_effective}\n' "$url"
done
```

## Notes For The Next Operator

- Do not use `source .env`; this repo's `.env` has entries that are not safe shell assignments and can leak noisy output.
- Use the existing Node `.env` loader pattern in `direct-pages-deploy.mjs`.
- Do not deploy this portfolio over `metraiyux-0s-marketing`; this closure recreated the dedicated `gray-skyes-founder-portfolio` project for the founder portfolio.
- After live headed browser proof passes, update `LIVE_DEPLOYMENT_LEDGER.md` with deployment `85623c18-1dfa-4d55-83c5-89eb13ca6e18` and the proof receipt path.
- No long-running proof/deploy process was left running when this handoff was written.

