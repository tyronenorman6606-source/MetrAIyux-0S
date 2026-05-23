# Deploy

```bash
npm install
npx wrangler d1 create relay13_core
```

Paste the returned database ID into `wrangler.toml`.

```bash
openssl rand -hex 32
npx wrangler secret put PLATFORM_ADMIN_TOKEN
npm run d1:migrate:remote
npm run deploy
```

Open `/admin/`, paste the same admin token, and click `Bootstrap default workspace`.

## Install widget on another website

After deployment, use this snippet from the admin dashboard:

```html
<script src="https://YOUR-RELAY13-DOMAIN/widget/embed.js" data-workspace="relay13-default" defer></script>
```

Replace the domain and workspace slug.
