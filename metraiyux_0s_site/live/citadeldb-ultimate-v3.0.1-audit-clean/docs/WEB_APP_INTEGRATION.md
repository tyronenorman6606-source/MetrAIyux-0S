# Website + Operator App Integration

CitadelDB v1.1 includes two web surfaces.

## Public branded website

Location:

```text
site/
```

Build:

```bash
cd site
npm install
npm run build
```

Preview:

```bash
npm run preview
```

The site is company-facing and claim-safe. It launches toward `/app`.

## Private operator app

Location:

```text
operator-dashboard/
```

In the full stack:

```bash
make prod-up
```

Private dashboard:

```text
http://127.0.0.1:7413
```

## Rule

The website can be public.

The operator dashboard should remain private or behind Omega Skygate / SoveReign13 / VPN / Cloudflare Access.

## Logo assets

```text
brand/assets/citadeldb-ultimate-logo.png
brand/assets/citadeldb-app-icon-192.png
brand/assets/citadeldb-app-icon-512.png
site/public/assets/
operator-dashboard/public/assets/
```
