# ConnectLog Production Drop Notes

## Static drop status

This package is ready for Netlify drag-and-drop static deployment. Root files include `index.html`, `app.html`, `styles.css`, `app.js`, `qr-lite.js`, `manifest.json`, `sw.js`, icons, logo assets, and seed data.

## Git deploy status

`netlify.toml` is included. Netlify should run `npm run check` and publish the repository root. No bundler is required.

## Proof command

```bash
npm run check
npm test
npm run build
```

All three currently route to the same static proof gate.

## Domain note

Add a final production sitemap after the live domain is chosen. Sitemap XML requires absolute URLs, so this package intentionally avoids hardcoding a fake production domain.
