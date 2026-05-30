# AI Music Collective Pipeline

This is the ready lane for living artists in SkyeMusicNexus.

## Provider Keys

- `ELEVENLABS_API_KEY` is the recommended first key for provider-backed AI music generation.
- `STABILITY_API_KEY` is optional for Stability AI / Stable Audio experiments.
- `OPENAI_API_KEY` is used for planning, lyrics/copy support, feed captions, release strategy, and storefront product copy.

## Flow

1. Artist or collective owner requests a song from Founder Hub or Store Command.
2. The system creates a generation receipt and provider prompt.
3. The generated audio is stored under the artist storefront release folder.
4. Nexus creates a release record with artist ID and collective ID.
5. Nexus creates feed posts, campaign copy, and product copy.
6. Nexus creates a Store product, defaulting songs to `$4.44` unless overridden.
7. SovereignDocs/Workforce paperwork gates payout release and revenue split approval.

## Gray Skyes Collective

All local site artists are currently attached to `gray-skyes-collective`. Attribution remains on the artist record, while collective ownership and payout review roll up to Gray Skyes until another approved artist/company creates its own collective.

## Paperwork Packets Needed

- Artist platform account agreement
- Collective membership agreement
- AI-generated music disclosure when applicable
- Storefront revenue split schedule
- Vendor/seller payout profile
- Independent contractor packet only when the artist is also being paid by the company for services
