# NexusArtistPrimePackage

Gray Skyes prime package for Skye Music Nexus.

This folder intentionally keeps copied source surfaces under `originals/`:

- `originals/gray-skyes/`
- `originals/gray-skyes-brain/`
- `originals/gray-skyes-collective/`

The root package adds the new polished front door, interactive catalog player, live Nexus links, Legal Skyes links, and a SkyeNet release-lane summary without mutating the original Gray folders outside this package.

Latest rebuild notes:

- The hero uses Gray's real video vault from `originals/gray-skyes/media/video/`.
- The page has exactly one persistent audio element in the fixed bottom player.
- Every play action in the hero, catalog, and release wall loads that same bottom player.
- Video playback stays muted/visual by default so it never competes with the music player.

SkyeNet deploy lane:

```bash
SKYENET_AUTH="$ZERO_OS_OWNER_BEARER" npm run skyenet:deploy:gray-prime
```

Expected live route after a successful deploy:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyenet/musicnexus/gray-skyes-prime/
```
