# Client App Factory Operator Guide

This factory is now built to take a business from Valley Verified and turn it into a packaged client app with the same end-to-end flow we have been hand-finishing.

## What it does

The factory now runs in four layers:

1. `factory-core`
   - imports or loads the client record
   - clones the white-label base
   - rewrites branding, routes, and record data
   - runs source scanning before and after generation

2. `factory-enhance`
   - harvests live-surface assets when the client has a reachable website
   - uses uploaded, live-surface, open-source/licensed, or AI-generated assets with provenance when the live site is thin
   - creates motion-loop hero media from live stills, uploaded media, or AI-receipted identity images
   - writes identity, enhancement, and Valley sync payloads

3. `factory-verify`
   - checks routes, generated files, and packaged app health
   - writes `CLIENT_VERIFICATION_REPORT.json`

4. `factory-pipeline`
   - runs core, enhance, verify, workspace linking, payment lane setup, and proof ledger updates

## Local operator flow

1. Start the factory:

```bash
cd /workspaces/MetrAIyux-0S/client-app-factory
node server.mjs 4199
```

2. Open:

```text
http://127.0.0.1:4199/
```

3. In the app:
   - click **Browse Valley Clients**
   - search the Valley business you want
   - click **Import record** if you want to inspect it first
   - click **Import + Full Factory** if you want the full end-to-end run

4. When the run finishes, check:
   - generated app folder under `client-apps/<client-id>/`
   - enhancement report
   - verification report
   - Valley sync payload

## Output locations

- client record:
  - `storage/records/<client-id>.json`

- packaged app:
  - `client-apps/<client-id>/`

- storage mirror:
  - `storage/generated-apps/<client-id>/`

- live-surface cache:
  - `storage/live-surface-cache/<client-id>/`

- generated brand and motion fallback assets:
  - `storage/generated-brand/<client-id>/`
  - `storage/generated-motion/<client-id>/`

## What happens when the client site has weak media

If a client site exposes:

- a logo only:
  - the factory uses that logo
  - builds fallback motion from a harvested still or branded slate

- a poster/still but no video:
  - the factory generates motion-loop hero, walkthrough, inventory, and vertical media from the still

- no usable identity media at all:
  - the factory blocks fake initials/text-logo fallbacks
  - upload a real logo/image, harvest one from a live/open-source/licensed surface, or run the AI identity image lane
  - after a real/provenanced image exists, send it into Still2Vid Forge from the Media Pack page

That means the run can still recover from weak media, but it should not invent fake text logos just to keep moving.

## Still2Vid Forge handoff

The Media Pack page can hand a real image/logo into `/Free99/apps/still2vid-forge/index.html`.

- Handoff key: `METRAIYUX_MEDIA_HANDOFF`
- Required source types: `operator-upload`, `live-surface`, `open-source`, or `ai-generated`
- Required proof: a source URL, license/provenance note, or AI generation receipt
- Gate rule: Still2Vid is Free99, but Free99 still requires the FS27/0S gate session

## Known good test cases

- `next-level-gaming-goodyear`
  - imported from Valley
  - harvested live logo + still
  - generated motion hero from live still
  - full pipeline green

- `fade-masters-phx`
  - imported from Valley
  - live site not reachable from this environment
  - generated branded slate + motion fallback
  - full pipeline green

## Quick verification

```bash
cd /workspaces/MetrAIyux-0S/client-app-factory
node tests/smoke.mjs
```

Optional:

```bash
curl http://127.0.0.1:4199/api/health
curl "http://127.0.0.1:4199/api/factory/valley/businesses?q=next%20level"
```

## Next expected operator move

For a new company:

1. pick them from Valley
2. import the record
3. run full factory
4. review the generated app
5. decide whether the niche needs an extra bespoke component pass

That gets us from directory entry to working packaged client app in one flow.
