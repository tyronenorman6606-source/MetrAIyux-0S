# Local Cabinet Brain

This package now includes a lightweight local brain for the MetrAIyux 0S Executive Office.

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

## Safety limits

This brain is a company knowledge assistant. It should not claim sample planning roles are legally appointed officers. Use real verified people for actual incorporation filings.
