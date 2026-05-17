# Local Cabinet Brain

This package now includes a local command brain for the MetrAIyux 0S Executive Office.

## What it does

- Searches the included cabinet resumes, executive roster, governance charter, and company doctrine.
- Answers questions inside the browser using local retrieval.
- Requires no GPU, database, paid API, or server for the default mode.
- Includes optional wiring for a local Ollama, llama.cpp, or OpenAI-compatible endpoint.

## Entry page

Open:

```text
local-brain.html
```

For best local testing, serve the folder instead of double-clicking the file:

```bash
python3 -m http.server 5173
# then open http://localhost:5173/local-brain.html
```

## Optional Ollama setup

Install Ollama, then pull a small model:

```bash
ollama pull llama3.2:3b
ollama serve
```

The page includes an endpoint tester pointed at:

```text
http://localhost:11434/v1/chat/completions
```

If the browser blocks the request because of local CORS policy, keep the built-in retrieval mode or run the optional proxy below.

## Optional tiny proxy

A tiny proxy is included at:

```text
brain/local-brain-proxy/server.js
```

Run it only if you want the browser to talk to Ollama through a same-origin local server.

```bash
cd brain/local-brain-proxy
npm install
npm start
```

Then open:

```text
http://localhost:8787/local-brain.html
```

## Obsidian vault sync

The repo includes `obsidian-vault/` as the project command center. Notes with `brain: true` in frontmatter can be exported into the local brain:

```bash
npm run brain:sync:obsidian
```

The export writes:

```text
metraiyux_0s_site/brain/obsidian-sync.json
```

The browser brain loads that file when present, alongside the main knowledge base, live surface registry, legal sync, marketplace sync, persona registry, site-operator routes, and sales offer registry.

## 0S command runner

Operator commands are repo-local and intentionally kept outside the deployable static site.

Detailed command IDs are documented in `docs/OBSIDIAN_0S_OPERATOR_SYNC.md` and are available through the repo-local CLI help. Actual shell execution stays local through the command runner.

Public deployment note: do not place the detailed command registry under `metraiyux_0s_site/` unless the host protects it with real auth.

## Safety limits

This brain is a company knowledge assistant. It should not claim sample planning roles are legally appointed officers. Use real verified people for actual incorporation filings.
