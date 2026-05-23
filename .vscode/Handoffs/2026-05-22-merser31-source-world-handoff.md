# Merser3.1 Source World Closure Handoff

Date: 2026-05-22  
Lane: `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1`  
Product: **Merser3.1 by Skyes Over London**  
NPM: `@skyes0verl0nd0n/merser3-1@3.1.0`  
Live site: https://merser3-1.pages.dev/  
Health: https://merser3-1.pages.dev/health  
MCP endpoint: https://merser3-1.pages.dev/mcp  

## Bottom Line

Merser3.1 is live as its own separate source-world MCP base. The public npm package is published, the CLI works through `npx`, the production site is serving the final Merser3.1 build, the Pages Worker health endpoint is back online, and unauthenticated `/mcp` correctly returns shared-gate `401`.

The remaining caution is the headed browser proof script. The live app diagnostic proves the page hydrates, renders Merser3.1 text, exposes the runtime, has no page errors, and loads the final asset. The reusable `npm run proof:live` harness is still brittle under Xvfb and did not produce a clean `ok: true` receipt before this handoff. Treat the site as deployed and stress-backed, but do **not** represent the browser-proof gate as cleanly passed until the proof harness is stabilized and rerun.

## What Is Live Now

- Canonical live URL: `https://merser3-1.pages.dev/`
- Current production JS asset: `/assets/index-DjeG13Ly.js`
- Current production CSS asset: `/assets/index-DEXt2w1K.css`
- Live title/meta now says `Merser3.1 by Skyes Over London`.
- Live `/health` returns JSON `ok: true`.
- Live unauthenticated `POST /mcp` returns `401 Gate access required` with the shared 0S/NorthStar gate URL.
- Final direct deployment accepted by Cloudflare Pages:
  - Deployment id: `29b6caae-058e-4da8-b5d1-d86ce98c9a07`
  - Preview URL: `https://29b6caae.merser3-1.pages.dev`
  - Commit message: `Merser3.1 scroll telemetry worker closure`

## NPM / CLI Status

Published package:

```bash
@skyes0verl0nd0n/merser3-1@3.1.0
```

Verified registry metadata:

```json
{
  "name": "@skyes0verl0nd0n/merser3-1",
  "version": "3.1.0",
  "bin": {
    "Merser": "bin/merser",
    "merser": "bin/merser",
    "Merser31": "bin/merser",
    "merser31": "bin/merser",
    "merser3-1": "bin/merser"
  }
}
```

Verified `npx` health from `/tmp`:

```bash
npm exec --yes --package @skyes0verl0nd0n/merser3-1@3.1.0 -- Merser --health
```

Returned:

- `ok: true`
- `displayName: "Merser3.1 by Skyes Over London"`
- package name `@skyes0verl0nd0n/merser3-1`
- bin aliases `Merser`, `merser`, `Merser31`, `merser31`, `merser3-1`
- remote site/health/MCP URLs

## MCP Tools

The local and packaged MCP server exposes:

- `mcp5_index`
- `mcp5_packs`
- `mcp5_room`
- `mcp5_component`
- `mcp5_prompt_pack`
- `mcp5_cli`
- `mcp5_build_plan`
- `mcp5_icons`

Local client config:

```json
{
  "mcpServers": {
    "merser31": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/stdio-server.mjs", "--stdio"]
    }
  }
}
```

NPM client config option:

```json
{
  "mcpServers": {
    "merser31": {
      "command": "npx",
      "args": ["--yes", "--package", "@skyes0verl0nd0n/merser3-1@3.1.0", "Merser", "--stdio"]
    }
  }
}
```

## Source World Work Completed

The current source in `src/App.jsx` implements the requested Merser3.1 direction:

- React + R3F + Three + Drei + postprocessing world surface.
- GSAP + Lenis scroll engine.
- Framer Motion / Motion UI chrome.
- Theatre runtime values.
- Remotion player section.
- Skyes Over London PWA/logo assets.
- Zoomed-out initial camera.
- Scroll-driven entry telemetry.
- Runtime scroll projection for camera distance and surface reveal.
- Draggable chamber/minimap behavior.
- Modular dimensional surfaces around each room.
- `ROOM_DIMENSIONS` with four surfaces per room.
- Med spa broken into dimensional surfaces:
  - `Treatment Orbit`
  - `Glow Proof`
  - `Booking Gate`
  - `Consent Screen`
- Runtime reports `dimensionalSurfaces: true` and `dimensionSurfaceCount: 20`.

Important source files:

- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/src/App.jsx`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/src/styles.css`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/mcp4-core.mjs`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/stdio-server.mjs`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/http-server.mjs`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/remote/worker-source.mjs`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/tools/stress-merser.mjs`
- `/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/tools/proof-merser31-production.mjs`

## Stress Proof

Latest stress command:

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
timeout 420s npm run stress -- --live-base https://merser3-1.pages.dev --local-port 8792 --concurrency 12 --http-iterations 36 --live-iterations 24 --stdio-iterations 10
```

Latest stress report:

```bash
/workspaces/MetrAIyux-0S/test-artifacts/merser31-mcp-stress/2026-05-22T11-25-54-591Z-merser31-mcp-stress-report.json
```

Result:

- `ok: true`
- package smoke passed
- stdio passed
- local HTTP passed
- live root passed
- live health passed
- live unauthenticated MCP gate passed

## Live Browser Proof Status

The reusable proof harness was attempted several times. It is not cleanly passing yet.

Current useful diagnostic:

```bash
/workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/diag.png
```

Diagnostic browser run observed:

- title `Merser3.1 by Skyes Over London`
- body contains visible `Merser3.1` content
- root hydrated with roughly 30k characters of HTML
- script loaded from `https://merser3-1.pages.dev/assets/index-DjeG13Ly.js`
- runtime exists as `window.__MERSER31_RUNTIME__`
- runtime reports:
  - `react: true`
  - `framerMotion: true`
  - `motion: true`
  - `gsap: true`
  - `lenis: true`
  - `three: true`
  - `r3f: true`
  - `drei: true`
  - `postprocessing: true`
  - `theatre: true`
  - `remotion: true`
  - `dimensionalSurfaces: true`
  - `dimensionSurfaceCount: 20`
  - `cameraDistance: 21`
  - `sourcePreviewVisible: true`
- no failed requests
- no page errors

Latest older proof report that wrote JSON:

```bash
/workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/latest-live-headed-browser-report.json
```

That older report is `ok: false` because Xvfb reported `canvasFrames: 0` and only saw camera distance move `21 -> 20.6`. Source has since been patched so the scroll engine publishes projected `cameraDistance` and `surfaceRevealDepth` even when WebGL frames are not advancing in the proof browser.

Proof harness changes made:

- replaced brittle visible text locator with runtime/body readiness checks
- changed navigation from `domcontentloaded` to `commit`
- then paused per operator request before another full proof completion

Recommended next proof command:

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
rm -rf /workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/production-final
timeout 720s xvfb-run -a npm run proof:live -- --url https://merser3-1.pages.dev --output-dir /workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/production-final
```

After it runs, inspect:

```bash
node - <<'NODE'
const fs = require('fs');
const p = '/workspaces/MetrAIyux-0S/test-artifacts/merser31-live-proof/production-final/live-headed-browser-report.json';
const r = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log(JSON.stringify({
  ok: r.ok,
  health: r.health,
  mcpGate: r.mcpGate,
  viewports: r.viewports?.map(v => ({
    name: v.viewport?.name,
    ok: v.ok,
    checks: v.checks,
    initialRuntime: v.initialRuntime,
    scrolledRuntime: v.scrolledRuntime
  }))
}, null, 2));
NODE
```

## Cloudflare Deploy Notes

Normal Wrangler Pages deploy repeatedly stalled/fetched-failed in this workspace:

```bash
npx wrangler pages deploy dist --project-name merser3-1 --branch main --commit-dirty=true --skip-caching
```

Working direct deploy path used:

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
npm run build:worker

node - <<'NODE'
const fs = require('fs');
(async () => {
  const fd = new FormData();
  fd.set('metadata', JSON.stringify({ main_module: '_worker.js' }));
  fd.set('_worker.js', new File([fs.readFileSync('dist/_worker.js', 'utf8')], '_worker.js', { type: 'application/javascript+module' }));
  const blob = await new Response(fd).blob();
  const ab = await blob.arrayBuffer();
  fs.mkdirSync('/tmp/merser31-direct-pages', { recursive: true });
  fs.writeFileSync('/tmp/merser31-direct-pages/_worker.bundle', Buffer.from(ab));
})();
NODE

set -a; source /workspaces/MetrAIyux-0S/.env >/dev/null 2>&1; set +a
curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/merser3-1/upload-token" \
  > /tmp/merser31-direct-pages/upload-token.json

node - <<'NODE'
const fs = require('fs');
const j = JSON.parse(fs.readFileSync('/tmp/merser31-direct-pages/upload-token.json', 'utf8'));
if (!j.success || !j.result?.jwt) throw new Error('no jwt');
fs.writeFileSync('/tmp/merser31-direct-pages/upload-token.txt', j.result.jwt);
NODE

timeout 900s env \
  CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  CLOUDFLARE_ACCOUNT_ID="$CLOUDFLARE_ACCOUNT_ID" \
  CF_PAGES_UPLOAD_JWT="$(cat /tmp/merser31-direct-pages/upload-token.txt)" \
  npx wrangler pages project upload dist \
  --output-manifest-path /tmp/merser31-direct-pages/manifest.json

curl -sS -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/merser3-1/deployments" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -F "manifest=</tmp/merser31-direct-pages/manifest.json" \
  -F "branch=main" \
  -F "commit_dirty=true" \
  -F "commit_message=Merser3.1 scroll telemetry worker closure" \
  -F "_worker.bundle=@/tmp/merser31-direct-pages/_worker.bundle;type=application/octet-stream" \
  -F "_routes.json=@/workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1/dist/_routes.json;type=application/json"
```

Do not print or commit Cloudflare tokens.

## Current Verification Commands

Live asset:

```bash
curl -sS 'https://merser3-1.pages.dev/?v=handoff' | rg 'index-DjeG13Ly|Merser3.1 by|<title>'
```

Health:

```bash
curl -sS https://merser3-1.pages.dev/health
```

Unauthenticated gate:

```bash
curl -i -sS -X POST https://merser3-1.pages.dev/mcp \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

NPM:

```bash
npm view @skyes0verl0nd0n/merser3-1 version name bin --json
npm exec --yes --package @skyes0verl0nd0n/merser3-1@3.1.0 -- Merser --health
```

## What Not To Claim Yet

Do not claim the live headed browser proof gate has passed. The live app is deployed, npm-published, stress-backed, and diagnostically hydrated, but the formal proof receipt still needs a clean `ok: true` run after the latest proof harness changes.

Do not create a separate auth lane. Merser3.1 must stay on shared 0S/FS27/SkyGate/NorthStar bearer access for `/mcp`.

Do not touch `.vscode/MCP3`; it is unrelated to this lane.

## Recommended Next Closure Steps

1. Run the proof command above until it writes `production-final/live-headed-browser-report.json`.
2. If proof passes, update the 0S changelog/valuation/Skyeway/dev-free-sauce surfaces with Merser3.1.
3. Redeploy those public surfaces.
4. Run the repo live-browser verifier against those surfaces.
5. Add the new successful proof receipt paths back into this handoff.

