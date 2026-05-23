# MetrAIyux 0S Full Website — Preview Base Build

This package was rebuilt from the uploaded `preview (4).html` base. The original uploaded file is preserved at `source-base/preview-4-original.html`.

## Included pages

- `index.html` — homepage derived from the uploaded preview base
- `what-this-does/index.html` — plain-language product explanation
- `platform/index.html` — architecture and layers
- `command/index.html` — command routing model
- `workspaces/index.html` — customer, owner, buyer, artist, and Valley Verified workspace paths
- `proof/index.html` — proof and claims posture
- `live-surfaces/index.html` — route directory
- `contact/index.html` — approved contact paths

## Assets

- `assets/site.css` — shared design system extracted from the uploaded base, plus multipage extensions
- `assets/site.js` — shared interactivity extracted from the uploaded base
- `assets/metraiyux-0s-logo-transparent.png` — real MetrAIyux 0S logo asset used by the pages

## Deploy

Upload the folder contents to Cloudflare Pages, Netlify, or the static-asset side of the Worker. Keep the folder structure intact so all relative page and asset paths resolve.

No generated replacement logo is included. The pages use the actual MetrAIyux 0S transparent logo asset and retain the live fallback path: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/assets/metraiyux-0s-logo-transparent.png`.
