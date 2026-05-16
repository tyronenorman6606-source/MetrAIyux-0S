# White-Label Client Command Deck

This folder is the client-deployable version of the command system. It is meant to be copied per client, branded for that company, and deployed as either the client's full public website or as a command layer mounted under a route such as `/command-deck`.

## What This Is

This is not just a website template. It is a public website, internal command deck, customer portal, approval inbox, local brain library, proof system, and Cloudflare Worker kit. The client sees a serious operating layer they can run from, not a thin landing page.

## White-Label Defaults

- Public platform name: `Client Command Deck`
- Public company placeholder: `Client Company`
- Founder placeholder: `Client Founder`
- Admin email placeholder: `owner@example.com`
- Public URL placeholder: `https://client-domain.example`
- Worker subdomain placeholder: `CLIENT_WORKERS_SUBDOMAIN`

Client-specific display values live in `client-config.json`. Most pages that load `script.js` will replace the default placeholders at runtime from that config.

## Per-Client Setup

1. Copy this whole folder for the client.
2. Fill out `client-intake.example.json` and save it as a client-specific file.
3. Run:

```bash
node scripts/prepare-client-deck.mjs ./client-intake.example.json
```

4. Replace the client's logo, favicon, portrait, service copy, pricing, legal/policy copy, and proof claims.
5. Create Cloudflare resources for that client only: Workers, KV namespaces, D1 databases, and Queues.
6. Replace every `REPLACE_WITH_CLIENT_*` value in the generated Wrangler config.
7. Set secrets with `wrangler secret put`, never inside committed files.
8. Deploy the public shell, then deploy the optional Worker kits.
9. Create the first admin token and hand the client their login/operating instructions.

## Safety Rule

Do not reuse your own production KV IDs, D1 IDs, queues, Worker names, Resend sender, admin token, or OpenAI key unless you intentionally want to operate that client from your account. The template has placeholders so the client deployment cannot accidentally point back to your live system.

## Positioning

Your sales angle is correct:

> Anyone can sell a website. This gives the business a command deck: lead intake, customer workspace flow, admin decisions, proof receipts, approval gates, local business brains, and Cloudflare-backed infrastructure.

For small companies, sell the outcome as: the website is the front door, but the command deck is the business infrastructure behind it.
