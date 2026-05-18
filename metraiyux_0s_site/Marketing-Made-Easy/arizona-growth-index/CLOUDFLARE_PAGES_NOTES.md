# Cloudflare Pages Notes — Arizona Growth Index

This folder is static and can deploy directly to Cloudflare Pages.

Recommended build settings:
- Framework preset: None
- Build command: leave blank
- Output directory: `/` if deploying this folder as its own project, or `arizona-growth-index` if deploying from the repository root.

Files included:
- `_headers` for security and cache headers.
- `_redirects` for simple URL cleanup.
- `sitemap.xml`, `rss.xml`, and `llms.txt` for search and AI discovery.

Keep `founder-console/` out of public navigation. If you host the root package, protect the console behind SkyGate or Cloudflare Access.
