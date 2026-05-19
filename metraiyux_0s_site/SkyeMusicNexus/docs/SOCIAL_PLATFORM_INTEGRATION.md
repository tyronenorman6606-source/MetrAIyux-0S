# SkyeMusicNexus Open Social Spine

Generated: 2026-05-18

## What Was Added

SkyeMusicNexus now has a gated open-social integration lane:

- `public/feed.html` is the artist/operator surface for Pixelfed-style posts, Fediverse feed sync, and provider publishing.
- `netlify/functions/music-social.js` stores connector metadata, queues release posts, publishes through Mastodon-compatible APIs when a server-side token env var exists, and reads public/tag timelines.
- `open-source/social-platform-manifest.json` records the open-source platform targets and production boundaries.
- `public/admin.html` now exposes social connector and post-queue visibility in the operator stage.

## Platform Targets

Pixelfed is the first Instagram-like target. It is open source, ActivityPub/fediverse based, and documented as AGPL-licensed upstream software. The MusicNexus connector treats Pixelfed as a Mastodon-compatible posting target for status and media publication until a specific instance requires a Pixelfed-only endpoint.

Mastodon-compatible Fediverse servers provide the stable OAuth, media, status, public timeline, and hashtag timeline surfaces. MusicNexus uses those APIs for provider publishing and feed sync.

Funkwhale is cataloged as the music-native federated audio platform target. It stays a production contract until native Funkwhale API token mapping, rights flow, and storage handoff are attached.

ActivityPub is represented as a future native actor bridge. The queued post stores an ActivityStreams-style preview, but native federation still requires actor documents, WebFinger, HTTP signatures, inbox/outbox persistence, moderation, and abuse controls.

## Token Policy

Provider tokens must stay server-side.

The browser submits a `tokenEnvKey`, for example `SKYE_MUSIC_PIXELED_TOKEN`. The function checks `process.env[tokenEnvKey]` at publish time. No provider access token is persisted in `social-spine.json` and no provider token is emitted back to the browser.

Required scopes for Pixelfed/Mastodon-compatible publishing:

- `write:statuses`
- `write:media` when publishing with media
- `read:statuses` or public timeline access for feed sync

## Provider Publishing Flow

1. Save a connector on `public/feed.html`.
2. Queue a post with `artistId`, optional `releaseId`, caption, hashtags, media URL, alt text, and visibility.
3. Publish the queued post.
4. If the token env var is missing, the post remains in `provider-token-required`.
5. If the token exists, `music-social.js` uploads remote public media to `/api/v2/media`, then posts to `/api/v1/statuses` with an idempotency key.

## Boundaries

This does not claim a native owned Fediverse server yet. That requires ActivityPub actor hosting, inbox/outbox routing, HTTP signatures, WebFinger, remote delivery queues, moderation controls, blocklists, report handling, and abuse response policy.

This does not bypass release rights. Social publication should stay behind the rights gate whenever real audio, cover art, likeness, samples, or distribution claims are involved.

## Source Anchors

- Pixelfed upstream: https://github.com/pixelfed/pixelfed
- Mastodon OAuth/API docs: https://docs.joinmastodon.org/spec/oauth/
- Mastodon media API: https://docs.joinmastodon.org/methods/media/
- Mastodon public timeline docs: https://docs.joinmastodon.org/client/public/
- Funkwhale docs: https://docs.funkwhale.audio/
- ActivityPub recommendation: https://www.w3.org/TR/activitypub/
