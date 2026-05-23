# Client App Factory Production Backend Deploy

The `client-app-factory` shell can live inside `metraiyux_0s_site`, but the generation pipeline itself needs a real Node runtime because it:

- writes records and generated apps to disk
- shells out to `ffmpeg`
- harvests live-surface assets
- runs scans and verification passes

## Required production shape

1. **0S frontend shell**
   - publish the shell into `metraiyux_0s_site/client-app-factory/`
   - local command:
     - `node client-app-factory/scripts/publish-0s-shell.mjs`

2. **Dedicated backend origin**
   - build and run the included Docker image:
     - `docker build -t client-app-factory ./client-app-factory`
     - `docker run -p 4199:4199 client-app-factory`
   - or deploy the same runtime on any Node host that supports `ffmpeg`
   - a ready Render blueprint now exists at:
     - [render.yaml](/workspaces/MetrAIyux-0S/client-app-factory/render.yaml)

3. **0S Worker proxy**
   - set `CLIENT_APP_FACTORY_ORIGIN` in `metraiyux_0s_site/wrangler.toml` (or deploy env)
   - the 0S Worker then exposes the backend at:
     - `/api/client-app-factory/*`

## Local mounted proof

Run the exact mounted flow we expect in 0S:

```bash
node client-app-factory/tests/proof-mounted.mjs
```

That command:

- republishes the shell into `metraiyux_0s_site/client-app-factory/`
- ensures the backend is running on `:4199`
- starts a mounted local 0S proof server on `:4319`
- runs Playwright against:
  - `http://127.0.0.1:4319/client-app-factory/`

## Operator URLs

- frontend shell in 0S:
  - `/client-app-factory/`
- backend health through 0S:
  - `/api/client-app-factory/health`
