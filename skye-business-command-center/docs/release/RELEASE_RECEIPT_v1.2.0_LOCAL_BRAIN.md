# Release Receipt v1.2.0 — Local Brain

Added an embedded local site brain.

## New surfaces

- `apps/hub/public/brain.html`
- `apps/hub/public/assets/brain.js`
- `apps/brain-service` optional Node/Ollama bridge
- `docs/brain/LOCAL_BRAIN_GUIDE.md`
- `templates/brain/local-brain-demo-prompts.md`

## Honest capability

The default brain is local knowledge retrieval, not a live LLM. Optional Ollama mode is available after operator configuration and smoke testing.

## Production gate

Do not sell as live AI model included until `LOCAL_LLM_PROVIDER=ollama`, model pull, endpoint reachability, `/health`, and ask-response tests are verified.
