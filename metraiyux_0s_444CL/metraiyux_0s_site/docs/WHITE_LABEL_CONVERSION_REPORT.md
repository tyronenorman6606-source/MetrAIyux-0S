# White-Label Conversion Report

## Converted

- Root `wrangler.toml` no longer points to the original production Worker origins.
- Worker kits now use client-safe service names and placeholder resource IDs.
- Public defaults now say `Client Command Deck`, `Client Company`, and `Client Founder`.
- Admin endpoint defaults now use same-origin instead of the original production Worker.
- Client branding can be changed through `client-config.json`.
- Added client intake, client env example, cost model, and deployment runbook.

## Still Deliberately Left As Template Internals

- Some file names and asset names still contain old slugs so existing links do not break.
- Cabinet persona names remain as demonstrative operating roles. Replace them with real staff, departments, or neutral role names before a production client launch.
- Security Gate Brain file routes still use existing paths where changing filenames would break links.
- Legal, tax, HR, compliance, insurance, and certification pages remain demonstrative and must be reviewed for each client.

## Before Any Client Production Launch

- Replace logo assets.
- Replace founder portrait and founder page.
- Replace public services, pricing, industries, proof claims, and policies.
- Create unique Cloudflare resources for the client.
- Set a unique `ADMIN_TOKEN`.
- Set provider secrets with `wrangler secret put`.
- Run browser smoke tests on the public site and admin pages.
- Confirm `/sitemap.xml`, `/robots.txt`, and public URLs match the client domain.
