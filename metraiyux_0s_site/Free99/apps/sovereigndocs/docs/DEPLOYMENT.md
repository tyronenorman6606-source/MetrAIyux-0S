# SovereignDocs Deployment

## Static Netlify Drop

Use when you want the public static platform fast.

Build command: leave blank

Publish directory: `.`

This mode supports the landing page, template library, builder, exports, local vault, local audit console, upload workspace, PWA shell, and template admin documentation.

## Node API Mode

Use when you want local API persistence and server endpoints.

```bash
npm run 0s:worker:dev
```

Open:

```txt
http://localhost:8787
```

## Git Deploy Warning

For Netlify Functions/serverful behavior, use Git deployment and wire functions or a separate API host. A drag-and-drop static deploy cannot run the Node API server.

## Cloudflare Path

Recommended production architecture:

- Cloudflare Pages for static app
- Workers for API
- D1 or Neon for metadata
- R2 for generated document files
- Queues for export/signature jobs
- Upstream auth through Omega Skygate or equivalent
