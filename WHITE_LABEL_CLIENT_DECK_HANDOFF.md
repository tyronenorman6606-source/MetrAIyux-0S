# White-Label Client Deck Handoff

Updated: 2026-05-15

## Where I Left Off

The cloned white-label version lives here:

- `/workspaces/MetrAIyux-0S/metraiyux_0s_444CL/metraiyux_0s_site`

The packaged archive lives here:

- `/workspaces/MetrAIyux-0S/metraiyux_0s_444CL_WHITE_LABEL_CLIENT_COMMAND_DECK.zip`

The archive was tested with `unzip -t` and passed integrity checks.

## What Was Completed

- Converted the cloned deck into a white-label client command deck.
- Added `client-config.json` for runtime client-facing brand values.
- Added `client-intake.example.json` and `.env.client.example`.
- Added `scripts/prepare-client-deck.mjs` to stamp a client config into the deck.
- Replaced hardcoded production Worker names, D1/KV IDs, queues, emails, and public defaults with client-safe placeholders where they were deployment-facing.
- Scrubbed visible/default MetrAIyux, Gray London Skyes, Skyes Over London, Sovereign 13, and 0meg4kAI brand surfaces from scanned text files.
- Kept old asset filenames/slugs where renaming could break working links.

## Verification Completed

- JS syntax checks passed for the edited runtime/admin/worker files.
- Local HTTP smoke test passed with Playwright across public, admin, SaaS, client OS, and local brain pages.
- No browser console/page errors were found in that smoke pass.
- No broken images were found in the tested pages.
- No old visible brand text was found in scanned non-binary text files, excluding `.wrangler`.

## Main Docs To Reopen

- `/workspaces/MetrAIyux-0S/metraiyux_0s_444CL/metraiyux_0s_site/docs/WHITE_LABEL_CLIENT_DEPLOYMENT.md`
- `/workspaces/MetrAIyux-0S/metraiyux_0s_444CL/metraiyux_0s_site/docs/CLIENT_RUNTIME_COST_MODEL.md`
- `/workspaces/MetrAIyux-0S/metraiyux_0s_444CL/metraiyux_0s_site/docs/WHITE_LABEL_CONVERSION_REPORT.md`

## Cost Model Snapshot

- Lean client deployment: about `$0-$10/month` raw infrastructure.
- Serious small-business deployment: about `$10-$75/month`.
- Heavier active client: about `$75-$400+/month`.
- Managed platform pricing should sit above raw cost, likely `$150-$500+/month` minimum depending on support, AI volume, email volume, proof work, reporting, and hands-on operations.

## Next Useful Step

For each real client, create a filled intake JSON, run the prepare script, create fresh Cloudflare resources, set fresh secrets, deploy the static/full system, and smoke test the client login and customer workspace paths before handoff.
