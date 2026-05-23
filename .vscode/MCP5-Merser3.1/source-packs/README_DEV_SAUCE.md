# MetrAIyux 0S Dev Sauce Icon + Component Website

This package extends the preview-base MetrAIyux 0S website with a public developer asset room.

## New route

- `dev-sauce/index.html` — icon library, PNG exports, SVG copy buttons, IMG copy buttons, and copy-paste UI components.

## New assets

- `assets/icons/metraiyux/*.svg` — 52 standalone SVG icons. Each file is an individual image asset.
- `assets/icons/metraiyux-png/*.png` — 52 individual PNG exports at 512 x 512.
- `assets/icons/metraiyux-icons.json` — manifest with name, slug, category, purpose, SVG path, and PNG path.
- `assets/metraiyux-sauce-kit.css` — copy-paste CSS kit for reusable `sx-*` components.

## Use in another page

```html
<link rel="stylesheet" href="/assets/metraiyux-sauce-kit.css">
<img class="metra-icon" src="/assets/icons/metraiyux/command-core.svg" alt="Command Core icon" width="64" height="64">
```

## Logo rule

The package keeps the actual `metraiyux-0s-logo-transparent.png` asset already used by the website. No substitute logo was added.

## Deploy

Upload the folder as a static site to Cloudflare Pages, Netlify, or the current Worker static asset pipeline. Keep the `assets/` folder beside the HTML routes.
