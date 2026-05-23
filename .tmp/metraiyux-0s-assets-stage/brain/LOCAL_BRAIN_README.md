# Cabinet Brain Router

This package now includes a command intelligence brain for the MetrAIyux 0S Executive Office.

## What it does

- Searches the included cabinet resumes, executive roster, governance charter, and company doctrine.
- Answers questions inside the browser using private retrieval.
- Requires no GPU, database, paid API, or server for the default mode.
- Includes optional wiring for a operator-controlled Ollama, llama.cpp, or OpenAI-compatible endpoint.

## Entry page

Open:

```text
local-brain.html
```

For operator testing, serve the folder instead of double-clicking the file:

```bash
python3 -m http.server 5173
# then open https://metraiyux-0s-full-system.graylondonskyes.workers.dev/local-brain.html
```

## Optional Ollama setup

Install Ollama, then pull a small model:

```bash
ollama pull llama3.2:3b
ollama serve
```

The page includes an endpoint tester pointed at:

```text
https://operator-inference.example/v1/chat/completions
```

If the browser blocks the request because of endpoint CORS policy, keep the built-in retrieval mode or run the optional proxy below.

## Optional tiny proxy

A tiny proxy is included at:

```text
brain/local-brain-proxy/server.js
```

Run it only if you want the browser to talk to Ollama through a same-origin operator server.

```bash
cd brain/local-brain-proxy
npm install
npm start
```

Then open:

```text
https://metraiyux-0s-full-system.graylondonskyes.workers.dev/local-brain.html
```

## Obsidian vault sync

The repo includes `obsidian-vault/` as the project command center. Notes with `brain: true` in frontmatter can be exported into the cabinet brain:

```bash
npm run brain:sync:obsidian
```

The export writes:

```text
metraiyux_0s_site/brain/obsidian-sync.json
```

The browser brain loads that file when present, alongside the main knowledge base, live surface registry, legal sync, marketplace sync, persona registry, site-operator routes, sales offer registry, SkyeVault repo map, and SkyeRunners repo map.

## SkyeRunners repo map

SkyeRunners are the repo-aware worker lane for local proof, knowledge-map refreshes, human-flow QA, and bug discovery. Their generated browser-brain feed is:

```text
brain/skyerunners.json
```

Refresh it directly:

```bash
npm run skyerunners:map
```

Refresh the full knowledge chain:

```bash
npm run skyerunners:run -- knowledge-refresh
```

The operator guide lives at:

```text
docs/SKYERUNNERS_OPERATOR_GUIDE.md
```

## 0S command runner

Operator commands are operator-repo and intentionally kept outside the deployable static site.

Detailed command IDs are documented in `docs/OBSIDIAN_0S_OPERATOR_SYNC.md` and are available through the operator-repo CLI help. Actual shell execution stays inside the operator command runner.

Public deployment note: do not place the detailed command registry under `metraiyux_0s_site/` unless the host protects it with real auth.

## Safety limits

This brain is a company knowledge assistant. It should not claim sample planning roles are legally appointed officers. Use real verified people for actual incorporation filings.
