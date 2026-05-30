# Sitemap Indexing Agent

Use this agent when public routes, static site roots, client apps, or canonical domains change.

## Run

```bash
npm run seo:agent
```

Use dry run mode before a broad domain migration:

```bash
node tools/sitemap-indexing-agent.mjs --dry-run
```

## Config

Public roots and canonical origins live in:

```bash
metraiyux_0s_site/seo/sitemap-agent.config.json
```

Add a site there when the agent reports `needs_origin`. Do not guess domains. Use the deployed production URL from Cloudflare Pages, Worker routes, Netlify, or the owned custom domain.

## Outputs

The agent writes per-site `sitemap.xml`, `robots.txt`, and `google-indexing-submit.json`, then writes the repo-wide operator reports:

```bash
metraiyux_0s_site/seo/sitemap-agent-report.json
metraiyux_0s_site/seo/SITEMAP_AGENT_REPORT.md
metraiyux_0s_site/seo/sitemap-agent-report.html
metraiyux_0s_site/seo/sitemap-agent-submit-links.json
```

## Boundaries

- Keep public SEO surfaces public and owner/admin surfaces gated through FS27/SkyGate/Free99.
- Do not create app-specific admin passwords.
- Do not print or commit bearer tokens, owner sessions, env secrets, or private handoff files.
- Missing production origins stay in the report until the owner supplies or verifies the domain.
