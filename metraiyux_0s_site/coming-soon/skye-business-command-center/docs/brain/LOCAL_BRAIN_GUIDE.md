# Local Brain Guide

The site now includes a local brain surface at `apps/hub/public/brain.html`.

## Honest default

By default, the brain is a packaged local knowledge assistant. It runs in the browser through `apps/hub/public/assets/brain.js` and answers from the included platform knowledge base. This is useful for demos, setup walkthroughs, sales guardrails, first-client launch, proof, maintenance, and production-gate questions.

## Optional LLM bridge

`apps/brain-service` is a small Node service that exposes `/ask` and `/health`. When `LOCAL_LLM_PROVIDER=openai`, it will call OpenAI using:

```env
LOCAL_BRAIN_ENABLED=true
BRAIN_SERVICE_PORT=8099
LOCAL_LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

When `LOCAL_LLM_PROVIDER=ollama`, it will call your local/GPU Ollama endpoint using:

```env
LOCAL_BRAIN_ENABLED=true
BRAIN_SERVICE_PORT=8099
LOCAL_LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5-coder:7b-instruct
```

Leave `LOCAL_LLM_PROVIDER=none` until the selected provider has valid credentials or a reachable model endpoint.

## Production claims

Do not claim a live AI model is included unless the LLM provider has been configured and smoke-tested. Safe claim: “The site includes an embedded local operations brain with packaged setup/sales/runbook knowledge and optional model-provider wiring.”
