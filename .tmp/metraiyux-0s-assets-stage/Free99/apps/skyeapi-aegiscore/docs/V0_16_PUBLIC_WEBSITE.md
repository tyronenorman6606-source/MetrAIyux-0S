# v0.17.0 Public Website Surface

v0.17.0 adds a first-class public website package for SkyeAPI + AegisCore.

## Added

- `apps/website` workspace package.
- Public landing page at `apps/website/index.html`.
- Visual styling and reveal behavior at `apps/website/src/site.css` and `apps/website/src/site.js`.
- Static SEO and AI-readable assets: `robots.txt`, `sitemap.xml`, `llms.txt`, `ai.md`, and `og.svg`.
- Website build script that bundles the operator console under `/console/` when `apps/console/dist` exists.
- `tools/smoke-website.mjs` to verify the public surface and console handoff.
- `tools/smoke-v16-product.mjs` to verify v0.16 package wiring.

## Claim boundary

The website is a public product surface and operator handoff. It does not claim hosted domain availability, search ranking, live provider delivery, payment capture, or browser execution.

## Correct deployment shape

Build order should compile the console first, then the website. The website build copies `apps/console/dist` into `apps/website/dist/console`, so the public landing page can route operators into `/console/` without mixing public copy and admin controls on the same page.
