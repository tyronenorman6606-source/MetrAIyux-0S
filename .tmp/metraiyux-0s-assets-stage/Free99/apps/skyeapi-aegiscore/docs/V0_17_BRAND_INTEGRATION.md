# v0.17.0 Brand Integration

This pass loops the generated SkyeAPI + AegisCore logo through the public and operator surfaces.

Implemented:

- Wide logo lockup asset for website and console.
- Square mark asset for favicon, Apple icon, console status art, and embedded visual accents.
- OpenGraph PNG generated from the selected lockup.
- Website header, hero, command preview, favicon, Apple icon, and social preview now reference the brand assets.
- Console hero and status panel now reference the same brand system.
- Console build copies branded assets into `apps/console/dist/assets`.
- Website build verifies brand assets are present and bundles console assets under `/console/assets`.
- `tools/smoke-v17-product.mjs` enforces the integration.

Truth boundary:

- This proves branded assets are present and wired into source/build outputs.
- This does not prove trademark clearance, hosted CDN behavior, search ranking, or browser visual pixel perfection.
