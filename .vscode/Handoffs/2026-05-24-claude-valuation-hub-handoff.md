# Claude Valuation Hub Handoff

Date: 2026-05-24
Repo: `/home/lordkaixu/Projects/MetrAIyux-0S`
Current protected Codex commit: `af52906b8` (`Fix DevodeRator card and mirror scripts`)

## Goal

Claude Code needs to do the independent Claude half of the DevodeRator valuation hub without overwriting the Codex/DevodeRator production repair that was just shipped.

The hub page is:

```text
marketing/devooderator/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html
```

The Claude prompt is:

```text
marketing/devooderator/blog/2026-05-24-claude-code-independent-valuation-prompt.md
```

Live hub URL:

```text
https://devooderator.pages.dev/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation
```

## Independence Rule

Claude should produce its valuation before reading the Codex tab in the hub page.

Recommended workflow:

1. Read `marketing/devooderator/blog/2026-05-24-claude-code-independent-valuation-prompt.md`.
2. Inspect the repo evidence named in that prompt.
3. Write Claude's independent valuation in a scratch file or direct response first.
4. Only after the independent valuation is complete, open the hub HTML and paste Claude's result into the existing `claude-panel`.
5. Do not edit the `codex-panel` language or numbers.
6. Leave `consensus-panel` pending unless the owner explicitly asks for the consensus pass.

## Protected Files From Codex Repair

Do not overwrite or reformat these files unless the owner explicitly asks for it:

```text
marketing/devooderator/cards.html
marketing/devooderator/style.css
marketing/devooderator/mirrors/social.html
marketing/devooderator/mirrors/founder-drops.html
marketing/devooderator/blog/2026-05-24-skynet-helper-k4i-production-lane.html
marketing/devooderator/script.js
marketing/devooderator/site-search.js
marketing/devooderator/skye-effects.js
marketing/devooderator/assets/SkyesOverLondonFounder.png
marketing/devooderator/assets/skyevault-autosync-daemon-blog-screenshot.png
LIVE_DEPLOYMENT_LEDGER.md
metraiyux_0s_site/changelog/index.html
metraiyux_0s_site/cloudflare/generated-changelog-page.mjs
```

Those were shipped live in DevodeRator Pages deployment:

```text
992ad2c2-6fb8-4642-b73a-3bf584fa50da
https://992ad2c2.devooderator.pages.dev
https://devooderator.pages.dev/
```

0S changelog was deployed as Worker version:

```text
4f347046-6083-49e8-8e0f-677877ef559b
```

## Files Claude May Edit

Primary edit target:

```text
marketing/devooderator/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html
```

Optional, only if the prompt needs small clarification:

```text
marketing/devooderator/blog/2026-05-24-claude-code-independent-valuation-prompt.md
```

Optional, only if the owner asks for navigation/link updates:

```text
marketing/devooderator/index.html
marketing/devooderator/social.html
```

Be careful: `marketing/devooderator/index.html` is already dirty in the workspace from prior work. If you touch it, inspect the existing diff first and preserve all current content.

## Evidence Claude Should Inspect

Minimum evidence set:

```text
marketing/metraiyux-0s/valuation-brief.md
metraiyux_0s_site/sales/platform-surface-pricing-registry.json
metraiyux_0s_site/sales/pricing-offer-router.html
metraiyux_0s_site/operator/deployment-ledger.html
metraiyux_0s_site/admin/site-valuation.html
package.json
.vscode/Handoffs/2026-05-23-0s-upscale-artist-nexus-relay13-handoff.md
```

Recent proof areas to sample:

```text
test-artifacts/deployment-agent/
test-artifacts/skyenet-live-production-stress*
test-artifacts/citadeldb-helper-k4i-live-api*
test-artifacts/connectlog-relay13*
test-artifacts/relay13*
test-artifacts/skyemail-zoho-provider-smoke/
test-artifacts/skyepay*
test-artifacts/live-browser-verifier/
metraiyux_0s_site/SkyeMusicNexus/proof/
```

Do not expose secrets or raw environment values. Cite file paths and receipt names, not tokens.

## Output Shape For The Claude Tab

The Claude panel should include:

1. Executive valuation range with low/base/high.
2. Devil's advocate haircut for prerevenue status, complexity, founder dependency, and scaffold/provider-gated surfaces.
3. Asset replacement-cost valuation based on repo evidence.
4. Revenue-capacity valuation based on published pricing, not booked customer revenue.
5. Strategic-option valuation for buyer/licensee/agency/platform partner scenarios.
6. Proof table with local file paths and receipts.
7. Risks and diligence gaps.
8. Plain-English conclusion.

Keep it sharp, honest, and repo-grounded. If Claude disagrees with Codex, that is useful. Do not force the ranges to match.

## Git Safety

The worktree is very dirty with unrelated changes. Do not clean, reset, checkout, or format the repo.

Before editing:

```bash
git status --short
git diff -- marketing/devooderator/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html
```

After editing, stage only Claude's valuation files:

```bash
git add marketing/devooderator/blog/2026-05-24-metraiyux-0s-devils-advocate-valuation.html
```

If the prompt file changed:

```bash
git add marketing/devooderator/blog/2026-05-24-claude-code-independent-valuation-prompt.md
```

Do not stage unrelated dirty files.

## Deploy Notes

If Claude is asked to deploy DevodeRator after inserting the Claude panel:

```bash
env PAGES_PROJECT=devooderator \
  PAGES_DIR=marketing/devooderator \
  PAGES_BRANCH=main \
  PAGES_COMMIT_MESSAGE='Add Claude valuation hub pass' \
  node tools/cloudflare-pages-direct-upload.mjs
```

Then run HTTP proof:

```bash
npm run deploy:agent:devooderator:smoke
npm run deploy:agent:devooderator:stress
```

The owner said they will handle live browser verification, so do not claim headed browser proof unless it is actually run.

