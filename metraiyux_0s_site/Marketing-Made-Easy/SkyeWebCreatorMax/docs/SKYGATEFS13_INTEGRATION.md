# SkyeGateFS13 Integration

SkyeWebCreatorMax is designed to run through SkyeGateFS13 when connected.

Inside the 0S mount, the canonical auth lane is the shared FS27/SkyGate/Free99 gate. Do not add a SkyeWebCreatorMax-specific founder/admin/client password. Browser calls must forward the shared gate session through `Authorization`, `x-free99-gate-session`, `x-skye-gate-session`, or the gate bridge headers.

## Browser Client

The standalone app loads:

```txt
js/skygate-client.js
```

It supports:

- `SkyeGateFS13Client.configure({ baseUrl, mirrorSecret, accessToken })`
- `SkyeGateFS13Client.mirrorEvent(...)`
- `SkyeGateFS13Client.askAI(...)`

## Gateway Routes

Canonical gateway:

```txt
AbovetheSkye-Platforms/SkyeGateFS13
```

Standalone/local gateway routes used:

- `/.netlify/functions/platform-event-ingest`
- `/.netlify/functions/gateway-chat`
- `/.netlify/functions/auth-app-login`

0S mounted Worker routes used:

- `/api/marketing-made-easy/webcreator-runtime/status`
- `/api/marketing-made-easy/webcreator-runtime/delivery-board`
- `/api/marketing-made-easy/webcreator-runtime/execution-board`
- `/api/marketing-made-easy/webcreator-runtime/dispatch-board`
- `/api/marketing-made-easy/webcreator-runtime/workflow-timeline`
- `/api/marketing-made-easy/webcreator-runtime/delivery-packs`
- `/api/marketing-made-easy/webcreator-runtime/auren`

## Required Production Vars

Gateway event mirroring needs one of:

- `SKYGATE_EVENT_MIRROR_SECRET`
- `SKYGATEFS13_EVENT_MIRROR_SECRET`

SkyeWebCreatorMax connected mode also expects:

- `SKYGATEFS13_BASE_URL`
- `SKYGATEFS13_APP_CLIENT_ID`
- `SKYGATEFS13_APP_CLIENT_SECRET`

SkyeWebCreatorMax production vars are listed in:

```txt
config/env.contract.json
```

## Flow

```txt
SkyeWebCreatorMax browser event
  -> js/skygate-client.js
  -> shared FS27/SkyGate/Free99 headers
  -> /api/marketing-made-easy/webcreator-runtime/*
  -> Marketing Made Easy Worker state
  -> SkyeGate audit/event mirror when accepted
```
