# Production Readiness

SkyeWebCreatorMax is considered locally production-shaped when:

- standalone release smoke passes
- browser smoke passes
- SkyeHands platform bus bridge smoke passes
- SkyeWebCreatorMax bridge smoke passes
- SkyDexia wiring smoke passes
- design-vault refresh passes
- production-readiness smoke reports only missing env vars

Local production-shaped is not the same as live telemetry proof. Customer-visible delivery, sessions, logs, and runtime board totals are production claims only after the shared-gated Worker routes under `/api/marketing-made-easy/webcreator-runtime/*` are verified with real authenticated HTTP/API checks.

## Allowed Production Blockers

For local packaging proof, the acceptable blockers are missing deployment/provider variables from:

```txt
config/env.contract.json
```

Required production variables:

- `SKYEWEB_PUBLIC_BASE_URL`
- `SKYEWEB_R2_ACCOUNT_ID`
- `SKYEWEB_R2_BUCKET`
- `SKYEWEB_R2_ACCESS_KEY_ID`
- `SKYEWEB_R2_SECRET_ACCESS_KEY`
- `SKYEWEB_AE_DELIVERY_ENDPOINT`
- `SKYEWEB_SKYDEXIA_ENDPOINT`
- `SKYGATEFS13_BASE_URL`
- `SKYGATEFS13_EVENT_MIRROR_SECRET`
- `SKYGATEFS13_APP_CLIENT_ID`
- `SKYGATEFS13_APP_CLIENT_SECRET`

Optional:

- `SKYEWEB_R3_BUCKET`
- `SKYEWEB_SIGNING_SECRET`

For live/customer-facing claims, missing shared-gated Worker proof is also a blocker. Do not use static endpoint files or browser-local storage as live customer visibility.

## Smoke

```bash
node AbovetheSkye-Platforms/SkyeWebCreatorMax/smoke/smoke-production-readiness.mjs
```
