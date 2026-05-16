# Per-Client Runtime Cost Model

Pricing checked on 2026-05-15 from official provider pages. Treat this as an operating estimate, not a guarantee.

## Baseline Stack

- Cloudflare Workers Paid plan for the account: about `$5/month` minimum.
- Static assets: generally free and unlimited when served as static assets through Workers/Pages.
- Workers dynamic requests: paid plan includes 10M requests/month, then `$0.30/million`.
- Workers CPU: paid plan includes 30M CPU ms/month, then `$0.02/million CPU ms`.
- D1: paid plan includes 25B row reads/month, 50M row writes/month, and 5GB storage, then overages.
- KV: paid plan includes 10M reads/month, 1M writes/month, and 1GB storage, then overages.
- Queues: paid plan includes 1M operations/month, then `$0.40/million operations`.
- Resend: free supports 3,000 transactional emails/month with 100/day limit; Pro is `$20/month` for 50,000 emails/month.
- OpenAI: optional. GPT-5.4 mini is `$0.75/1M input tokens` and `$4.50/1M output tokens`; GPT-5.4 is `$2.50/1M input` and `$15/1M output`.

## Practical Monthly Ranges

Lean client, mostly static site plus browser-local tools:

- Cloudflare: `$0-$5`
- Resend: `$0`
- OpenAI: `$0-$5`
- Expected infra cost: `$0-$10/month`

Serious small business deployment with Workers, D1/KV/Queues, approval emails, light AI:

- Cloudflare Workers Paid: `$5`
- Resend Pro if they exceed free/day limits: `$0-$20`
- OpenAI usage: `$5-$50`
- Expected infra cost: `$10-$75/month`

Heavier client with active customer portal, multiple staff, frequent AI, and many emails:

- Cloudflare: `$5-$25+`
- Resend: `$20-$90+`
- OpenAI: `$50-$300+`
- Expected infra cost: `$75-$400/month`

## Recommended Client Pricing Posture

Do not bill this as a commodity website. The client is getting a website plus an operating system.

Suggested pricing structure:

- Setup/build: charge for discovery, branding, content, deployment, auth, proof testing, and handoff.
- Monthly hosting/ops: charge a managed platform fee above raw provider cost.
- AI/email pass-through: either cap it inside the plan or bill overages.

For most early clients, a healthy floor is raw infra plus a management margin. If raw cost is `$10-$75/month`, a managed minimum in the `$150-$500/month` range makes more sense than charging the exact provider bill.

## Sources

- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- OpenAI API pricing: https://openai.com/api/pricing/
- Resend transactional pricing: https://resend.com/pricing?product=transactional
- Resend quotas: https://resend.com/docs/knowledge-base/account-quotas-and-limits
