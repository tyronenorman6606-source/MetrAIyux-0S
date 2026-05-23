# Merser3.1

**Merser3.1 by Skyes Over London** is the next source-world MCP base copied from the shipped Merser lane. It ships a public npm CLI, local stdio server, local HTTP bridge, Cloudflare Pages worker, and immersive React/R3F world surface for zoomed-out universe viewports and scroll-driven dimensional rooms.

React Three Fiber · Three.js · Drei · Postprocessing · GSAP · Lenis · Framer Motion · Motion · Theatre · Remotion · Cloudflare Pages · Model Context Protocol

Live world: [merser3-1.pages.dev](https://merser3-1.pages.dev/)
NPM package: [`@skyes0verl0nd0n/merser3-1`](https://www.npmjs.com/package/@skyes0verl0nd0n/merser3-1)

---

## Connect To Claude, Cursor, Or Any MCP Client

### Option 1 - Local Stdio

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

### Option 2 - NPM / NPX

```bash
npx @skyes0verl0nd0n/merser3-1 --health
npx @skyes0verl0nd0n/merser3-1 --tools
npm exec --yes --package @skyes0verl0nd0n/merser3-1@3.1.0 -- Merser --config
npm exec --yes --package @skyes0verl0nd0n/merser3-1@3.1.0 -- Merser --stdio
```

### Option 3 - Workspace Bin After Install

```bash
cd /workspaces/MetrAIyux-0S/.vscode/MCP5-Merser3.1
npm install
npm run cli -- --health
npm start
```

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

### Option 4 - Remote HTTP

```json
{
  "mcpServers": {
    "merser31": {
      "url": "https://merser3-1.pages.dev/mcp"
    }
  }
}
```

Remote HTTP access must stay gate-owned by the shared 0S/FS27/SkyGate/Free99 lane. The future public endpoint must return `401` without a valid owner-issued bearer or shared gate session.

---

## CLI

```bash
node stdio-server.mjs --help
node stdio-server.mjs --version
node stdio-server.mjs --tools
node stdio-server.mjs --config
node stdio-server.mjs --health
node stdio-server.mjs --stdio
npx @skyes0verl0nd0n/merser3-1 --health
npm exec --yes --package @skyes0verl0nd0n/merser3-1@3.1.0 -- Merser --tools
```

The package is published as `@skyes0verl0nd0n/merser3-1`; installed bin aliases include `Merser`, `merser`, `Merser31`, `merser31`, and `merser3-1`.

---

## MCP Tools

| Tool | What it returns |
| --- | --- |
| `mcp5_index` | Full Merser index: public URLs, package commands, room ids, pack ids, and tool list |
| `mcp5_packs` | Extracted source-pack manifest from the MCP2/Merser build lane |
| `mcp5_room` | Real-world immersive room specs: barbershop, tattoo, med spa, gym, and source vault |
| `mcp5_component` | Component vault entries pulled from the MCP bridge/source packs |
| `mcp5_prompt_pack` | Prompt packets for using the Merser source-world lane |
| `mcp5_cli` | CLI, local HTTP, deploy, stress, and remote access commands |
| `mcp5_build_plan` | Build plan for turning source packs into immersive world-site artifacts |
| `mcp5_icons` | Skyes/MetrAIyux icon registry and source-pack icon manifest |

---

## Runtime Stack

| Dependency | Version |
| --- | --- |
| `@modelcontextprotocol/sdk` | `^1.29.0` |
| `@react-three/fiber` | `^9.6.1` |
| `@react-three/drei` | `^10.7.7` |
| `@react-three/postprocessing` | `^3.0.4` |
| `three` | `^0.184.0` |
| `postprocessing` | `^6.39.1` |
| `gsap` | `^3.15.0` |
| `lenis` | `^1.3.23` |
| `framer-motion` | `^12.38.0` |
| `motion` | `^12.38.0` |
| `@theatre/core` | `^0.7.2` |
| `remotion` | `^4.0.464` |
| `@remotion/player` | `^4.0.464` |
| `react` | `^19.2.6` |
| `react-dom` | `^19.2.6` |
| `zod` | `^4.1.12` |
| `lucide-react` | `^1.16.0` |

---

## Planned Live Surfaces

- Site: [https://merser3-1.pages.dev/](https://merser3-1.pages.dev/)
- Health: [https://merser3-1.pages.dev/health](https://merser3-1.pages.dev/health)
- MCP endpoint: [https://merser3-1.pages.dev/mcp](https://merser3-1.pages.dev/mcp)
- 0S SkyeWay listing: [https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyeway.html](https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyeway.html)

---

## Local Development

```bash
git clone <your-workspace>
cd .vscode/MCP5-Merser3.1
npm install
npm run dev
npm run start:http
npm run stress
```

Local stdio from this repo:

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

---

## Stress And Proof

The new base must not ship until it has package, stdio, local HTTP, live site, live health, unauthenticated gate, and headed browser proof.

```bash
npm run stress
npm run build:worker
npm run deploy
```

Latest release proof at publish time:

- Stdio MCP calls passed.
- Local HTTP `/health`, `tools/list`, and `tools/call` stress passed.
- Live root and `/health` stress passed.
- Live unauthenticated `/mcp` correctly returned `401`.
- Headed browser proof passed desktop and mobile with real interactions.

---

## License

UNLICENSED. Public npm distribution is for controlled developer access to Merser, the source-world MCP server and release lane by Skyes Over London. Do not treat this as an open-source license grant.
