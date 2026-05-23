# Merser

**Merser by Skyes Over London** is a public npm MCP server and immersive source-world lab built from the MCP2/MCP4 extracted room packs.

React Three Fiber · Three.js · Drei · Postprocessing · GSAP · Lenis · Framer Motion · Motion · Theatre · Remotion · Cloudflare Pages · Model Context Protocol

Live world: [merser.pages.dev](https://merser.pages.dev/)

---

## Connect To Claude, Cursor, Or Any MCP Client

### Option 1 - npx

```json
{
  "mcpServers": {
    "merser": {
      "command": "npx",
      "args": ["-y", "@skyes0verl0nd0n/merser", "--stdio"]
    }
  }
}
```

### Option 2 - Global Install

```bash
npm install -g @skyes0verl0nd0n/merser
merser --stdio
```

```json
{
  "mcpServers": {
    "merser": {
      "command": "merser",
      "args": ["--stdio"]
    }
  }
}
```

### Option 3 - Remote HTTP

```json
{
  "mcpServers": {
    "merser": {
      "url": "https://merser.pages.dev/mcp"
    }
  }
}
```

Remote HTTP access is gate-owned by the shared 0S/FS27/SkyGate/Free99 lane. The public endpoint returns `401` without a valid owner-issued bearer or shared gate session.

---

## CLI

```bash
npx @skyes0verl0nd0n/merser --help
npx @skyes0verl0nd0n/merser --version
npx @skyes0verl0nd0n/merser --tools
npx @skyes0verl0nd0n/merser --config
npx @skyes0verl0nd0n/merser --health
npx @skyes0verl0nd0n/merser --stdio
```

The npm package is `@skyes0verl0nd0n/merser`; installed bin aliases include `merser`, `merser-mcp`, and `Merser`.

---

## MCP Tools

| Tool | What it returns |
| --- | --- |
| `mcp4_index` | Full Merser index: public URLs, package commands, room ids, pack ids, and tool list |
| `mcp4_packs` | Extracted source-pack manifest from the MCP2/MCP4 build lane |
| `mcp4_room` | Real-world immersive room specs: barbershop, tattoo, med spa, gym, and source vault |
| `mcp4_component` | Component vault entries pulled from the MCP bridge/source packs |
| `mcp4_prompt_pack` | Prompt packets for using the Merser source-world lane |
| `mcp4_cli` | CLI, local HTTP, deploy, stress, and remote access commands |
| `mcp4_build_plan` | Build plan for turning source packs into immersive world-site artifacts |
| `mcp4_icons` | Skyes/MetrAIyux icon registry and source-pack icon manifest |

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

## Live Surfaces

- Site: [https://merser.pages.dev/](https://merser.pages.dev/)
- Health: [https://merser.pages.dev/health](https://merser.pages.dev/health)
- MCP endpoint: [https://merser.pages.dev/mcp](https://merser.pages.dev/mcp)
- 0S SkyeWay listing: [https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyeway.html](https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skyeway.html)

---

## Local Development

```bash
git clone <your-workspace>
cd .vscode/MCP4
npm install
npm run dev
npm run start:http
npm run stress
```

Local stdio from this repo:

```json
{
  "mcpServers": {
    "merser": {
      "command": "node",
      "args": ["/workspaces/MetrAIyux-0S/.vscode/MCP4/stdio-server.mjs", "--stdio"]
    }
  }
}
```

---

## Stress And Proof

The release lane includes package, stdio, local HTTP, live site, live health, unauthenticated gate, and headed browser proof.

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
