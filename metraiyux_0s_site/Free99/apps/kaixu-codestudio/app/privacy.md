# Privacy — kAIxu CodeStudio Pro

## What this app collects
- No advertising IDs.
- No third-party analytics.
- No background telemetry.

## What is stored locally
- Workspace files and settings (IndexedDB).
- Audit events (local only).
- Assistant chat history (local only).

## AI requests
When you send a message to the assistant, the app sends your prompt and optional active-file context to the Kaixu Gateway:
- Endpoint: https://kaixugateway13.netlify.app/.netlify/functions/gateway-chat

The gateway key is provided by you and stored encrypted on device.
