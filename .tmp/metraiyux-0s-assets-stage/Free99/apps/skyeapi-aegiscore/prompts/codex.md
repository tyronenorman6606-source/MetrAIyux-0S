# Codex task: integrate SkyeAPI into this repo

You are integrating SkyeAPI, not raw provider SDKs.

Rules:

1. Do not ask the user for Resend, Twilio, Neon, Stripe, OpenAI, or Cloudflare secrets.
2. Do not create new `.env` requirements for those providers unless SkyeAPI is unavailable.
3. Use `SKYEAPI_BASE_URL` and `SKYEAPI_KEY` for hosted mode.
4. For local development, use the SkyeAPI CLI and AegisCore Lite.
5. Call normalized SkyeActions:
   - `email.send`
   - `sms.send`
   - `db.query`
   - `ai.generate_text`
   - `billing.create_checkout`
   - `storage.upload`
6. Do not print raw secrets in logs, tests, pages, comments, screenshots, or documentation.
7. Add proof checks showing the app calls SkyeAPI and receives structured results.

Preferred integration:

```ts
import { SkyeAPIClient } from "@skyeapi/sdk";

const skye = new SkyeAPIClient({
  baseUrl: process.env.SKYEAPI_BASE_URL!,
  apiKey: process.env.SKYEAPI_KEY!
});
```

Before claiming done, prove at least one route or server action invokes SkyeAPI and handles success/failure.


Codex-specific instruction: modify the codebase directly, add tests where possible, and summarize exact files changed. Do not claim provider calls work unless a smoke test proves the SkyeAPI endpoint responded.
