# Proof Recording Playbook

Status: deprecated for Codex-run work.

The owner/admin has disabled Codex browser proof and proof recording. Do not run these browser recorder commands unless the owner explicitly re-enables browser proof in the current task. Use deploy receipts, static checks, API smoke, and authenticated HTTP stress instead; the owner performs live browser verification manually.

This historical playbook describes the old browser-proof recorder for public sites, client previews, and operating surfaces.

## What It Produces

- A browser-driven proof walkthrough MP4.
- Captioned proof states, so viewers know what they are seeing.
- PNG screenshots for every checkpoint.
- A JSON report with the route, output files, and proof boundaries.

## Run The Default MetrAIyux Recipe

```bash
npm run proof:record:metraiyux
```

Current behavior: this command returns a no-browser disabled receipt.

Output:

```text
test-artifacts/proof-recordings/metraiyux-public-proof/
```

## Run Any Site Recipe

```bash
npm run proof:record -- --config proof-recipes/your-site.json
```

Current behavior: this command returns a no-browser disabled receipt.

Recipes can point at a local static folder:

```json
{
  "name": "Client site proof",
  "slug": "client-site-proof",
  "siteRoot": "client-site-folder",
  "chapters": [
    {
      "path": "index.html",
      "title": "Homepage loads the real offer",
      "body": "The first screen shows the product, CTA, and proof path.",
      "actions": [
        { "type": "screenshot", "name": "homepage" },
        { "type": "scroll", "y": 900, "afterMs": 600 },
        { "type": "screenshot", "name": "second-section" }
      ]
    }
  ]
}
```

Or at a deployed URL:

```json
{
  "name": "Live production proof",
  "slug": "live-production-proof",
  "baseUrl": "https://example.pages.dev",
  "chapters": [
    {
      "path": "index.html",
      "title": "Production homepage proof",
      "actions": [{ "type": "screenshot", "name": "production-home" }]
    }
  ]
}
```

## Supported Actions

- `caption`: change the on-screen proof caption.
- `fill`: set an input or textarea value.
- `select`: select an option by value or label.
- `check`: check a checkbox or radio input.
- `click`: click by `selector` or exact `text`.
- `scroll`: scroll the browser viewport.
- `wait`: wait for a number of milliseconds.
- `screenshot`: save a proof frame.

## Style Rule

If the site claims “this app does X,” the recipe should open the actual surface and perform X in the browser. Do not use a landing page screenshot as proof of app behavior.

Keep secrets out of recordings. Do not show `.env`, bearer tokens, API keys, private dashboards, or owner-only controls unless the page is deliberately sanitized.
