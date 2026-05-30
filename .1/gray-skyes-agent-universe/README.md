# Gray Skyes Artist Universe

Fresh build folder for the Gray Skyes artist universe.

## Local Pages

- `index.html` - SupaBoy-parity first viewport with five Gray asset orbit rooms, central stage, route controls, and no heavy video load.
- `orbit.html` - playable floating song orbit moved off the landing page with all kept audio drops.
- `field-notes.html` - restored older-universe notes, video preview, posts, and 0S operator lane content.
- `catalog.html` - playable catalog room with all kept audio drops.
- `video-rooms.html` - full-screen video room that switches between every dropped video file.
- `music-video.html` - compatibility redirect into `video-rooms.html`.
- `gallery.html` - black-room gallery with expandable image rooms.
- `release.html` - release console for previews, package framing, and fan access paths.
- `zero-os.html` - 0S founder core surface.
- `live.html` - live, booking, press, and concert recap surface.
- `dashboard.html` - local artist dashboard for changing public song display titles.
- `scenes/gray-base64-scene.html` - encoded first-viewport scene built from Gray image assets.

## Asset Handling

- 9 dropped videos are copied into `media/video/` and wired into `data/videos.json`.
- 15 kept audio drops are copied into `media/audio/` and wired into `data/tracks.json`.
- The exact duplicate `HANDS UP MIX 1 SCOOTER .mp3` is excluded; `HANDS UP MIX 1 SCOOTER  (3).mp3` is the kept copy.
- Dropped images plus Gray/Skyes reference assets are copied into `media/images/`.

## Behavior

- The universe hub routes into separate catalog, song orbit, hero room, video, gallery, release, 0S, live, field-notes, and dashboard rooms.
- The homepage uses the SupaBoy-style five-room stage as the first screen, with Gray images, central orbit, active room state, stage controls, and no first-load video payload.
- The song orbit page renders all kept tracks as floating playable objects with drag/spin/hold/reset controls.
- The video room accepts `?video=<id>` and switches the full loop viewport.
- The catalog room plays local audio files.
- Dashboard title edits are stored under `gray-skyes-track-names-v2` and reflected by the catalog in the same browser profile.
- Internal receipts live under `receipts/`.
