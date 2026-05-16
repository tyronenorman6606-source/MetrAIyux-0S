# Deployment Command Center

## 1. Required infrastructure

- One Linux server with Docker and Docker Compose.
- DNS A records for three domains:
  - `PORTAL_DOMAIN`: public product portal.
  - `CONTROL_DOMAIN`: commercial control plane.
  - `FORGE_DOMAIN`: Forgejo forge.
- Ports 80/443 open for HTTPS.
- Port `FORGEJO_SSH_PORT` open for Git over SSH.

## 2. Configure environment

```bash
cp .env.example .env
chmod +x scripts/*.sh
./scripts/init-env.sh
nano .env
```

Set:

```env
PORTAL_DOMAIN=code.yourdomain.com
CONTROL_DOMAIN=app.yourdomain.com
FORGE_DOMAIN=forge.yourdomain.com
ACME_EMAIL=you@yourdomain.com
ADMIN_EMAILS=you@yourdomain.com
SOVEREIGN_SUPPORT_EMAIL=support@yourdomain.com
PUBLIC_FORGE_URL=https://forge.yourdomain.com
PUBLIC_CONTROL_URL=https://app.yourdomain.com
PUBLIC_PORTAL_URL=https://code.yourdomain.com
```

## 3. Deploy

```bash
./scripts/deploy.sh
```

## 4. Create Forgejo admin

Open the forge domain and complete first admin creation.

Create an admin API token inside Forgejo, then set:

```env
FORGEJO_ADMIN_TOKEN=your-token-here
```

Redeploy:

```bash
docker compose up -d --build control-plane
```

## 5. Connect auth gate

Use `docs/UPSTREAM_AUTH_GATE.md`. The control plane already accepts trusted headers or OIDC/JWT. Production should also configure Forgejo external auth against the same gate.

## 6. Register runner

Create a runner/token in Forgejo, then run:

```bash
FORGEJO_RUNNER_REGISTRATION_TOKEN=token_here ./scripts/register-runner.sh
```

## 7. Smoke proof

```bash
./scripts/smoke.sh
```

This proves portal, control-plane health/plans, forge HTTP, and SSH port. Full CI proof requires pushing `examples/.forgejo/workflows/smoke.yml` into a repository and watching the workflow pass.

## 8. Backups

```bash
./scripts/backup.sh
```

This dumps both PostgreSQL databases and archives config/customization files locally. Wire the archive folder to R2/S3/restic/borg for production offsite backups.
