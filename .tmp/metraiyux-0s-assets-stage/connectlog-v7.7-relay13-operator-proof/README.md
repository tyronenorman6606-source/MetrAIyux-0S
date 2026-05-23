# ConnectLog — Relationship Command OS v7

ConnectLog is a hardened production relationship operating system, not a throwaway contact list. It is published through the 0S Worker route, keeps operator records resilient through IndexedDB, and is wired to Relay13 for owned messaging when operator credentials are configured.

## Public landing + actual app flow

ConnectLog now has two clean entry surfaces:

- `index.html` is the public landing page. It explains what ConnectLog does, sells the value, supports SEO/social previews, and routes new users into the product.
- `app.html` is the actual field-use app. The PWA manifest uses `start_url: ./app.html`, so installed app launches go straight to the dashboard instead of forcing the user through the landing page.

The landing page includes direct launch controls for the app, exchange card, and feature sections. When a user opens the app from the landing page, the browser stores a return preference so future root visits can move straight back into the app. Incoming legacy `#connect=` exchange links that hit the landing page are redirected to `app.html#connect=...` so QR imports still land in the working app.

## Core surfaces

- Public landing page for first-time users, SEO, trust, product explanation, and app launch.
- Direct app workspace for daily field use and installed PWA launches.
- Dashboard with network counts, due follow-ups, high-priority contacts, dormant/at-risk relationships, and upcoming seven-day action load.
- People index with lane segmentation, status, priority, tags, notes, details, timeline logs, search, filters, and sorting.
- QR exchange center with a personal onboarding card, ConnectLog QR, phone-contact vCard QR, SVG download, `.vcf` download, copied payloads, and shareable HTML card export.
- QR intake scanner with camera mode when the browser supports `BarcodeDetector`, plus paste/manual mode for ConnectLog links, compact payloads, and vCards.
- Follow-up command actions directly on cards: mark contacted, snooze seven days, archive/restore, edit, delete with undo, and `.ics` calendar reminder export.
- Vault controls for JSON backup, CSV export, all-contact vCard export, import/merge/replace, and local wipe.
- Seed folder ingestion through `seed-data/manifest.json`, allowing curated or scraped contact packs to be merged after redeploy.

## Seed folder workflow

Drop one or more JSON packs into `seed-data/`. Each pack may be either:

```json
{
  "contacts": [
    {
      "name": "Example Prospect",
      "lane": "lead",
      "company": "Example Company",
      "role": "Owner",
      "status": "new",
      "priority": "high",
      "tags": ["seeded", "prospect"],
      "details": [
        { "type": "email", "label": "Email", "value": "owner@example.com" },
        { "type": "website", "label": "Website", "value": "https://example.com" }
      ],
      "notes": "Context, outreach angle, source, next step."
    }
  ]
}
```

or a raw array of contact objects.

Then run:

```bash
npm run seed:manifest
```

Deploy the folder. Inside the app, click `Scan seed folder`. The app fetches `seed-data/manifest.json`, loads each listed pack, validates and normalizes records, and merges them into the relationship vault.

Static browsers cannot reliably list arbitrary folder contents on every host, so the manifest is the hard truth. The included manifest generator makes the drop-folder workflow clean and repeatable.

## Local checks

```bash
npm run check
python3 -m http.server 8888
```

Then open the landing page at `/index.html` and the app at `/app.html`.

## Deployment

Upload the full folder to Netlify, Cloudflare Pages, or any static host. Keep these files at the deployed root:

- `index.html`
- `app.html`
- `landing.js`
- `styles.css`
- `app.js`
- `qr-lite.js`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`
- `assets/`
- `seed-data/`

## Auth posture

Operator credentials are handled at the gate/Relay13 layer, not embedded in public page source. The record model uses stable IDs and import/export paths so upstream sync adapters can be added without replacing the app.

## v5 relationship command upgrades

ConnectLog v5 added the command intelligence layer without adding auth. The `#intelligence` surface generates a daily mission brief, relationship queue, warm-list export, duplicate resolver, persistent-storage request, agenda `.ics` export, intro-template generator, and per-contact action scripts.

CSV imports are supported through the Vault controls. Use headers such as `name`, `business name`, `company`, `role`, `email`, `phone`, `website`, `linkedin`, `location`, `tags`, `notes`, and `next follow up`.

## v6 brand system update

ConnectLog v6 integrated the approved high-impact ConnectLog logo into the actual app package. The accepted logo powers the sidebar mark, hero visual stage, PWA manifest icons, favicon, apple touch icon, Open Graph preview, exchange-card surface watermark, and root icon files.

## v7 landing/app split

ConnectLog v7 adds the public landing page and points installed PWA launches directly at `app.html`. This keeps first-time education and search visibility separate from the fast operational interface needed in the field.

Run local checks with:

```bash
npm run check
```

This validates JavaScript syntax, service-worker syntax, QR engine syntax, required app UI IDs, duplicate IDs, selector integrity, manifest start URL, manifest shortcuts, landing-to-app routing, service-worker caching, approved logo wiring, and core v5-v7 feature presence.

## v7.1 card variant + photo exchange upgrade

ConnectLog v7.1 adds a multi-card exchange layer for real field use:

- Multiple exchange-card variants can now be stored locally in IndexedDB.
- Each card has its own label, audience/room, welcome message, tags, contact details, and photo.
- The active-card selector controls the ConnectLog QR, universal phone-contact QR, downloadable `.vcf`, copied app link, and shareable card HTML.
- Card photos are uploaded through the browser, resized locally, previewed in the app, stored in the local profile-card model, used in visual cards, added to downloadable `.vcf` exports, and passed through ConnectLog imports when the QR payload can safely carry the compact thumbnail.
- The phone-contact QR places the selected card’s welcome message inside the vCard `NOTE` field. If the card photo would make the phone QR unreliable, the app omits the photo from that QR but keeps it in the downloadable `.vcf`, card HTML, ConnectLog import, and local card preview.
- Imported ConnectLog cards now preserve welcome-message context and photo thumbnails on the saved contact record.
- The sidebar is now a central command menu with a minimize/expand control. The collapsed state persists locally.

Local proof still runs through:

```bash
npm run check
```

The v7.1 smoke check validates the new card management IDs, selector wiring, picture-upload controls, welcome-message field, multiple-card state, photo thumbnail persistence, vCard photo serializer, and collapsible-menu persistence.

## v7.2 Relay13 bridge

ConnectLog is now a production relationship/card app with Relay13-backed owned messaging. The Relay13 panel lets the operator configure the production Worker origin, public workspace slug, workspace ID, and private operator API key. If a browser cannot reach Relay13 or lacks credentials, ConnectLog queues delivery instead of falsely marking messages complete.

The QR bridge embeds only public Relay13 routing data: origin, workspace slug/ID, card ID, card label, and campaign. It never embeds the operator API key.

Run:

```bash
npm run check
```

## v7.4 system upgrade

ConnectLog now includes a Production Proof Command Center at `app.html#deployment`. It keeps ConnectLog deployment steps, Relay13 deployment steps, environment/config blocks, browser diagnostics, delivery queue state, and Relay13 readiness checks in one operator surface. It ties public delivery claims to Worker health, D1 workspace proof, activation proof, message-history proof, and WebSocket proof.


## v7.4 Relay13 Live-Readiness Upgrade

This build closes a wiring gap from the previous bridge pass: the Relay13 and Deployment Command Center controls are now explicitly bound in `app.js`, and the smoke test verifies required controls are both present in HTML and queried by the runtime.

Added:

- Relay13 ConnectLog bridge health check for `/api/v1/connectlog/health`.
- Active-card registry sync to `/api/v1/connectlog/cards`.
- Remote ConnectLog request refresh from `/api/v1/connectlog/requests`.
- Copyable active-card Relay13 payload for manual/API inspection.
- Cached ConnectLog request list inside the Relay13 panel.
- Diagnostics now check both generic Worker health and ConnectLog bridge health when an origin is configured.

Production boundary: live Cloudflare behavior is now proven by the recorded Worker, D1, activation, message-history, WebSocket, FS27, and stress receipts. Browser-side delivery still remains queued if this specific operator session lacks credentials or cannot reach the Worker.

## v7.5 Relay13 Message-Proof Upgrade

ConnectLog now works as a production relationship app with a Relay13 bridge. v7.5 strengthens the bridge by adding bridge stats, active-thread message pulling, request accept/archive actions, and a WebSocket proof-block generator. These are proof tools, not fake delivery claims: delivery status stays tied to Relay13 responses and proof receipts.
