# PWA Drop Factory 0S Live Report

Updated: 2026-05-25

## Direct Live Surfaces

- Founder Command PWA Drop Factory: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/founder-command/apps/pwa-factory-v213/`
- Runtime manifest: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/founder-command/apps/pwa-factory-v213/drop-factory-manifest.json`
- Nova Saint storefront: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/`
- Nova Saint artist app: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMusicNexus/artist-storefronts/artist-full-matrix-20260523053627/app/`
- Nova Saint song stream: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/skymusicnexus/music-assets?action=stream&id=aud_01b93295-0441-4386-bb16-ece7a4148c24`

## What Is Live

PWA Drop Factory is now a 0S-owned Founder Command app for packaging:

- local audio uploads as installable audio-player PWAs;
- SkyeMusicNexus single drops;
- SkyeMusicNexus artist albums;
- Gray Gang collective drops;
- imported HTML/project folders.

The browser runtime is self-contained and does not execute the donor zip. It uses the shared 0S gate and calls AI only through the gate-owned `/api/founder-command/pwa-factory/analyze` route.

## Auth / Gate Proof

- Unauthenticated `/founder-command/apps/pwa-factory-v213/` redirects with `302` to the shared `/admin/login.html?return=...` gate.
- Owner-authenticated access returns `200` for the app, CSS, JS, manifest, service worker, and runtime manifest.
- The old donor bridge route `/founder-command/apps/pwa-factory-v213/founder-drop-bridge.js` now returns `404`.

## Nova Saint Song Packaging Proof

The live proof used the existing local artist song from Nova Saint:

- Artist ID: `artist_full_matrix_20260523053627`
- Asset ID: `aud_01b93295-0441-4386-bb16-ece7a4148c24`
- Product ID: `prod_4dc19dd3-0d70-4129-889f-6cebda85bf44`
- Store price: `$4.44`
- Stream content type: `audio/mpeg`
- Stream bytes: `2,399,966`

The live PWA Factory JavaScript was fetched from production, executed in the proof harness, and used to package the Nova Saint audio into:

`test-artifacts/founder-command-pwa-drop-factory/live-nova-saint-song-drop.zip`

The generated ZIP contains `audio/nova-saint.mp3` and passed `unzip -t`.

## Stress Proof

Receipt:

`test-artifacts/founder-command-pwa-drop-factory/live-direct-smoke.json`

Result:

- Status: passed
- Total direct production requests: `100`
- Concurrency: `10`
- Failures: `0`
- p95: `861ms`
- max: `1949ms`

Covered routes:

- PWA Drop Factory app shell
- PWA Drop Factory CSS/JS/manifest/service worker/runtime manifest
- MusicNexus Nova Saint store API
- MusicNexus Nova Saint asset API
- MusicNexus Nova Saint stream API
- Gate-owned AI analyze API

## Boundary

No headed browser verification was run by automation for this pass because the owner requested to live-verify personally. This report is direct HTTP/API/ZIP/stress proof, not a browser-visual proof receipt.

## 2026-05-25 Gray Gang Drop Expansion

Current closure Worker version: `ab2faa4e-c588-4bd2-a456-56b6df5ec3d0`

Original Gray Gang drop expansion Worker version: `f481b6e3-5d4c-473d-a883-62b096b2610f`

The artist storefront system now hides raw profile/product/release JSON from direct app navigation and Worker serving. The PWA Factory uses `/api/founder-command/pwa-factory/artists` for curated artist metadata instead of static registry JSON.

Generated and packaged full-song drops:

- Dre Meridian - `Closed Door Voltage` - asset `aud_53274870-27df-4c51-b4cb-1269373d2459` - product `prod_a4bd93e3-2c3a-4cdd-89c6-90f55a48e2fc`
- Sol Amari - `Screenlight Survival` - asset `aud_558ccc3b-d6ae-4af4-a6d1-005802622b9a` - product `prod_5e62bd1d-88a6-46b0-a4a5-ad834b2f4593`
- Vox Selene - `Pixel Heartline` - asset `aud_6ee8aa34-d742-42aa-8401-4a149b064619` - product `prod_1f1d58a3-211d-490d-bd91-c3915fe62840`
- Veda Wraith x Orion Vale x DJ Ajay - `Three Suns After Midnight` - asset `aud_2d882b33-31b7-4a9a-8aa6-8321345be900` - primary product `prod_0f7dc8a6-ae19-431b-9154-a0b9b059e4bf`
- Vox Selene x Radio Vibez - `Signal Hearts` - asset `aud_54220f0d-a0d2-41b3-a416-7bf1ea5bbd27` - primary product `prod_d97acc02-5a0d-4273-8bcf-5b28f0150806`
- Jessa Walsh x Tha Stoves - `Soft Ghosts` - asset `aud_1088f8e2-d20a-4785-b2e9-9730aae00b0c` - primary product `prod_dac3c82b-75a7-4be3-abc7-b1860fc38b0e`

Direct production proof:

- Receipt: `test-artifacts/gray-gang-requested-songs/live-direct-proof-latest.json`
- Authenticated pages checked: `7`
- Raw dossier URL denials checked: `6`
- Live audio streams checked: `6`
- PWA ZIP drops checked: `11`
- Stress: `140` requests, concurrency `14`, failures `0`, p95 `181ms`, max `389ms`

Local package proof:

- Every generated ZIP under `SkyeMusicNexus/artist-storefronts/*/drops/` passed `unzip -t`.
- Nova Saint's corrected portrait is now installed at `artist-full-matrix-20260523053627/assets/artist-portrait.png`; the previous image is preserved as `artist-portrait-v1-backup.png`.
