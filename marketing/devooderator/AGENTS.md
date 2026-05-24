# DevodeRator Agent

This folder is Gray London Skyes' founder/dev blog site.

## Read First

Always read `AI_READ_ONLY_SITE_GOAL.md` before changing this site. That file is read-only for AI agents unless Gray explicitly says to edit it.

## Voice

Write posts from Gray's first-person perspective. The voice is direct, technically specific, founder-led, energetic, and honest about the struggle. Do not turn the site into bland corporate content.

Good post shape:

- What happened today.
- What broke or slowed the work down.
- What the architecture gap was.
- What tools/languages/agents/MCPs were used.
- What changed in the repo.
- What got deployed.
- What proof backs it.
- What the next feature lane is.

## Security

Never print secrets, passphrases, bearer tokens, admin codes, raw `.env` values, private unlock material, or signed owner URLs in public pages. For vault content, mention receipt IDs and gated proof routes, not raw credentials.

## Emoji Style

Use emoji as tasteful visual glyphs for headings, tags, and route labels. Keep critical text sober. Do not add emoji to code identifiers, payment terms, legal/compliance copy, auth instructions, error states, or incident language.

## Required Receipts

When adding a daily build post, include whatever proof exists:

- Cloudflare Pages preview or production URL.
- 0S Worker version ID if relevant.
- SkyeVault receipt/control receipt if relevant.
- Smoke-check command result in plain language.
- Stress/browser proof only if actually run.

If formal browser proof was skipped by request, say that directly instead of implying it passed.
