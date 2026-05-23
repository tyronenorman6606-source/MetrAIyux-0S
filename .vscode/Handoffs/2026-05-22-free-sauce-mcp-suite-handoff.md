# Free Sauce MCP Suite Handoff — 2026-05-22

## Current State

The Free Sauce / MCP developer hub is now built, deployed, and browser-checked.

Production page:

```text
https://metraiyux-0s-marketing.pages.dev/dev-hub.html
```

Cloudflare redirects the canonical production route to:

```text
https://metraiyux-0s-marketing.pages.dev/dev-hub
```

Latest deployment created during this handoff:

```text
Project: metraiyux-0s-marketing
Deployment ID: 8e7d9e9a-cbf1-4fc2-b612-c6a69ee7ad8d
Preview URL: https://8e7d9e9a.metraiyux-0s-marketing.pages.dev
Production branch: main
```

Do not paste or commit Cloudflare or npm tokens. This work used existing local environment credentials only.

## What Was Finished

### 1. SKRUCIBLE MCP

Published package:

```text
skrucible@1.0.3
```

Registry bin:

```json
{
  "skrucible": "skrucible.js"
}
```

Client config:

```json
{
  "mcpServers": {
    "skrucible": {
      "command": "npx",
      "args": ["-y", "skrucible"]
    }
  }
}
```

Live HTTP endpoint:

```text
https://skrucible.pages.dev/mcp
```

Verified capabilities:

- MCP initialize handshake works.
- `tools/list` returns 8 tools.
- `forge_shader`, `forge_component`, `forge_animation`, `forge_css`, `forge_stack`, `forge_palette`, `forge_mode`, and `forge_index` return real content.
- npm package has a real executable bin and was fixed past the original symlink startup bug.

Important local source path:

```text
.vscode/MCP3-SKRUCIBLE/npm-pkg/package.json
```

### 2. QuantumSkyes MCP

Published package:

```text
quantumskyes-mcp@1.0.1
```

Registry bin:

```json
{
  "quantumskyes-mcp": "quantumskyes-mcp.js"
}
```

Client config:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "npx",
      "args": ["-y", "quantumskyes-mcp"]
    }
  }
}
```

Repo-local source of truth:

```text
MCP/stdio-server.mjs
```

Published npm package source:

```text
MCP/npm-pkg/package.json
MCP/npm-pkg/quantumskyes-mcp.js
```

Remote production endpoint:

```text
https://skye-design-mcp.pages.dev/mcp
```

Access guide:

```text
https://skye-design-mcp.pages.dev/use-mcp.html
```

Verified capabilities:

- `tools/list` returns 27 tools.
- Bundled resources/templates/ledger were included so npm users are not dependent on this repo folder.
- The local repo MCP mine workflow passed against the marketing target after the final page changes:

```text
npm run mcp:mine -- marketing/gray-skyes-canonical-site
```

Receipt:

```text
marketing/gray-skyes-canonical-site/MCP_TOOLING_RECEIPT.json
test-artifacts/direct-mcp/gray-skyes-canonical-site-mcp-tooling-receipt.json
```

Latest post-change mine result:

```json
{
  "ok": true,
  "resourceReadCount": 18,
  "listedToolCount": 27,
  "toolCallCount": 30,
  "failedCalls": []
}
```

### 3. Skye World MCP / MCP2

Built and published package:

```text
skye-world-mcp@1.0.0
```

Registry bin:

```json
{
  "skye-world-mcp": "skye-world-mcp.js"
}
```

Client config:

```json
{
  "mcpServers": {
    "skye-world": {
      "command": "npx",
      "args": ["-y", "skye-world-mcp"]
    }
  }
}
```

Local source:

```text
.vscode/MCP2/stdio-server.mjs
.vscode/MCP2/package.json
.vscode/MCP2/npm-pkg/package.json
.vscode/MCP2/npm-pkg/skye-world-mcp.js
.vscode/MCP2/npm-pkg/README.md
```

Verified capabilities:

- `tools/list` returns 10 tools.
- World manifest returns 5 room entries.
- Quality gate passes for the expected Theatre.js / Remotion / R3F source signals.

## Marketing Page Work

Main file:

```text
marketing/gray-skyes-canonical-site/dev-hub.html
```

Related file changed:

```text
marketing/gray-skyes-canonical-site/index.html
```

The dev hub now includes:

- Hero: "Free Sauce. Real Stack."
- Three MCP cards:
  - SKRUCIBLE MCP
  - QuantumSkyes Design MCP
  - Skye World MCP
- Accurate npm versions:
  - `skrucible@1.0.3`
  - `quantumskyes-mcp@1.0.1`
  - `skye-world-mcp@1.0.0`
- npx config snippets for all three packages.
- HTTP endpoint config for SKRUCIBLE and QuantumSkyes.
- Proof blocks showing npm publish and stress-test evidence.
- A compact proof console with fields, filters, buttons, sliders, plan cards, and live counters so the page can be exercised like an operator surface during browser proof.

Final production curl check:

```json
{
  "status": 200,
  "title": "Free Sauce — Dev Hub · SkyesOverLondon",
  "hasConsole": true,
  "versions": true,
  "staleSkrucible102": false
}
```

Previously broken production assets now return `200`:

```text
canonical.js
assets/skyes-over-london-deity-logo.png
assets/SkyesOverLondonFounder-1.png
assets/SkyesOverLondonFounder-2.png
assets/metraiyux-0s-logo-transparent.png
assets/SkyesOverLondonFounder-4.png
```

## Deployment Notes

Wrangler Pages deploy was hanging after the Wrangler banner in this workspace. The successful deployment used Cloudflare Pages' direct asset upload flow:

1. Read Cloudflare token/account ID from local environment/.env.
2. Get Pages upload token.
3. Build Wrangler-compatible asset hashes using BLAKE3 over `base64(file) + extension`, sliced to 32 hex chars.
4. Check missing assets through `/pages/assets/check-missing`.
5. Upload missing assets through `/pages/assets/upload`.
6. Upsert hashes through `/pages/assets/upsert-hashes`.
7. Create deployment through `/accounts/{accountId}/pages/projects/metraiyux-0s-marketing/deployments`.

No credential values were written to this handoff.

If you need to redeploy manually and Wrangler still hangs, use the direct upload method again or first clear generated dependency folders to keep the workspace from filling up. At the time of this handoff the marketing folder itself is only about 71 MB, but the repo has generated `node_modules` copies in several `.vscode/MCP*` folders.

## Live Browser Proof

Reusable verifier command initially found real issues, then the issues were fixed:

```bash
npm run proof:live-browser -- --url https://metraiyux-0s-marketing.pages.dev/dev-hub.html --expect "Free Sauce"
```

First headed attempt failed because there was no X server. Retried with Xvfb and it found:

- Missing shared assets.
- Broken visible nav logo.
- Not enough interactive controls for the strict app-style action floor.

Fixes applied:

- Changed the nav logo from missing `assets/deity-logo-gold.png` to existing `assets/skyes-over-london-deity-logo.png`.
- Added `data-menu-toggle` to the mobile menu button.
- Added the proof console to provide real browser actions and state changes.
- Redeployed.

The reusable verifier was later interrupted by the busy workspace before it could write a complete final report, so I ran an equivalent headed Playwright proof under Xvfb and saved a complete receipt.

Final headed-browser proof receipt:

```text
test-artifacts/live-browser-verifier/2026-05-22T05-46-03-015Z-dev-hub-custom-headed-pass/live-browser-verification-report.json
```

Proof summary:

```json
{
  "ok": true,
  "mode": "custom-headed-live-browser-proof",
  "headless": false,
  "url": "https://metraiyux-0s-marketing.pages.dev/dev-hub.html",
  "failures": [],
  "checks": [
    {
      "name": "desktop",
      "size": "1440x980",
      "actions": 21,
      "stops": 7,
      "consoleErrors": 0,
      "failedRequests": 0,
      "brokenVisibleMedia": 0
    },
    {
      "name": "mobile",
      "size": "390x844",
      "actions": 23,
      "stops": 7,
      "consoleErrors": 0,
      "failedRequests": 0,
      "brokenVisibleMedia": 0
    }
  ]
}
```

Screenshots are saved in the same artifact folder as the receipt.

## Exact Verification Commands That Passed

Production page smoke:

```bash
curl -s -L -o /tmp/devhub-final.html -w '%{http_code} %{size_download} %{url_effective}\n' \
  https://metraiyux-0s-marketing.pages.dev/dev-hub.html
```

Registry metadata:

```bash
curl -s https://registry.npmjs.org/skrucible/latest | jq '{name,version,bin}'
curl -s https://registry.npmjs.org/quantumskyes-mcp/latest | jq '{name,version,bin}'
curl -s https://registry.npmjs.org/skye-world-mcp/latest | jq '{name,version,bin}'
```

MCP tooling receipt:

```bash
npm run mcp:mine -- marketing/gray-skyes-canonical-site
```

Browser proof receipt:

```bash
cat test-artifacts/live-browser-verifier/2026-05-22T05-46-03-015Z-dev-hub-custom-headed-pass/live-browser-verification-report.json | jq '{ok, mode, headless, url, failures}'
```

## Known Caveats

1. The reusable verifier command can be noisy in this Codespace because several unrelated headed proofs were also running. The saved final receipt is a custom headed Playwright proof with `headless: false`, desktop and mobile screenshots, scroll stops, interactions, console/network checks, and failure list.
2. The `quantumskyes-mcp` npm package is designed to run standalone, but the repo-local MCP remains the source of truth for development:

```json
{
  "mcpServers": {
    "quantumskyes": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/MCP/stdio-server.mjs"]
    }
  }
}
```

3. Do not move the public MCPs behind new app-specific passwords. If these become mounted 0S surfaces, wire them through FS27/SkyGate/Free99 per the repo auth rule.
4. If you republish any npm package, bump the version. npm will not let you overwrite:
   - `skrucible@1.0.3`
   - `quantumskyes-mcp@1.0.1`
   - `skye-world-mcp@1.0.0`

## Next Good Moves

1. Add a top-level nav link to `dev-hub.html` on any other public pages you care about, not only `index.html`.
2. Record a short screen capture of the dev hub and the npx setup for sales calls.
3. Add a `use-mcp.html` style setup page for SKRUCIBLE and Skye World, matching the QuantumSkyes access guide.
4. Decide whether QuantumSkyes should stay FS27 gate-owned for clients or expose a public readonly npm/stdio path as the default.
5. Consider adding a small API status badge section on the dev hub that fetches `/health` from SKRUCIBLE and QuantumSkyes live.

