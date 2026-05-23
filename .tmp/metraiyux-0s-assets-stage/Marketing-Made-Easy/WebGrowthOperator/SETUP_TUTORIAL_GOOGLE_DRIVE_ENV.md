# Skyes Over London LC — Cloudflare Packet Vault Setup

The AE/vendor onboarding lane is production-owned by the MetrAIyux 0S Cloudflare Worker. It does not use Netlify Functions or Google Drive for live packet storage.

Required Cloudflare pieces:

- `SITE_EVENTS_KV`
- `AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64`
- Shared FS27/SkyGate session or admin token for protected submissions

## Setup

1. Confirm `metraiyux_0s_site/wrangler.toml` binds `SITE_EVENTS_KV`.
2. Generate the packet encryption key:

```bash
openssl rand -base64 32
```

3. Store the generated value as a Cloudflare Worker secret:

```bash
npx wrangler secret put AE_VENDOR_PACKET_ENCRYPTION_KEY_BASE64 --config metraiyux_0s_site/wrangler.toml
```

4. Deploy the 0S Worker:

```bash
npx wrangler deploy --config metraiyux_0s_site/wrangler.toml
```

5. Confirm health:

```bash
curl https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/marketing-made-easy/ae-vendor-onboarding/health
```

The health response should show `cloudflare_only: true`, `netlify: false`, `googleDrive: false`, and `encrypted_storage: true`.

## Submission Endpoint

The browser form at `/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html` posts to:

```text
/api/marketing-made-easy/ae-vendor-onboarding/submit
```

The Worker validates required fields, requires a W-9 upload, encrypts payout details and uploaded files with AES-GCM, stores the packet in Cloudflare KV, and returns a receipt ID.

## Boundary

Packet submission creates an encrypted onboarding record and an internal payout ledger only. It does not send ACH, Stripe, PayPal, Cash App, or check payments. External transfers require owner/admin approval, verified payout destination, and a configured payout provider.
