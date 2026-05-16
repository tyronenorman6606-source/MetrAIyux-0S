# Open Source Materials for a GitHub Replacement

This is the material stack behind SoveReign13 Citadel Forge.

## Primary Forge Layer

### Forgejo

Use Forgejo as the main GitHub replacement base.

What it covers:

- Git hosting
- Organizations
- Repositories
- Issues
- Pull requests
- Code review
- Wiki
- Releases
- Package registry
- Actions-style automation with Forgejo Runner
- Admin interface
- API
- Self-hosted operation

Official material:

- https://forgejo.org/
- https://forgejo.org/docs/latest/
- https://forgejo.org/docs/next/admin/installation/docker/
- https://forgejo.org/docs/next/admin/actions/
- https://forgejo.org/docs/next/admin/actions/registration/
- https://forgejo.org/docs/latest/user/packages/
- https://forgejo.org/docs/latest/user/packages/npm/
- https://forgejo.org/docs/latest/user/packages/pypi/
- https://forgejo.org/docs/next/user/packages/generic/
- https://forgejo.org/docs/next/user/packages/container/
- https://forgejo.org/docs/latest/contributor/customization/
- https://forgejo.org/docs/next/admin/config-cheat-sheet/

Why this is the default:

Forgejo is the cleanest sovereignty-first choice. It is lighter than GitLab, more independent in governance than many alternatives, and maps closely enough to GitHub workflows for a fast migration.

## Alternative Forge Layer

### Gitea

Gitea is another strong self-hosted Git service.

Official material:

- https://about.gitea.com/
- https://docs.gitea.com/
- https://docs.gitea.com/usage/migration
- https://docs.gitea.com/usage/packages
- https://docs.gitea.com/administration/customizing-gitea

Use it if:

- You prefer Gitea upstream directly.
- You need its exact release cadence or ecosystem.
- You want MIT licensing at the forge layer.

### GitLab Community Edition

GitLab CE is powerful but heavy.

Official material:

- https://docs.gitlab.com/
- https://about.gitlab.com/install/

Use it if:

- You need a huge integrated DevSecOps suite.
- You can afford heavier RAM, CPU, storage, and maintenance.
- You want a mature all-in-one enterprise style platform.

### OneDev

OneDev is a compact all-in-one forge with Git, CI/CD, Kanban, and package features.

Official/material:

- https://github.com/theonedev/onedev
- https://code.onedev.io/

Use it if:

- You want one app with strong built-in CI/project management.
- You are okay with a smaller ecosystem than Forgejo/Gitea/GitLab.

## CI/CD Layer

### Forgejo Runner

Default runner for this kit.

Official material:

- https://forgejo.org/docs/next/admin/actions/
- https://forgejo.org/docs/next/admin/actions/registration/
- https://forgejo.org/docs/next/admin/actions/installation/docker/
- https://forgejo.org/docs/next/admin/actions/configuration/

### Woodpecker CI

Alternative or parallel CI/CD engine for Forgejo/Gitea.

Official material:

- https://woodpecker-ci.org/
- https://woodpecker-ci.org/docs/2.8/administration/forges/forgejo
- https://woodpecker-ci.org/docs/2.8/administration/forges/gitea

Use it if:

- You want a separate CI service.
- You want pipeline isolation from the forge.
- You prefer Woodpecker's YAML model.

### Jenkins

Fallback heavy automation engine.

Official material:

- https://www.jenkins.io/
- https://www.jenkins.io/doc/

Use it if:

- You need massive plugin coverage.
- You need legacy enterprise automation compatibility.
- You accept plugin maintenance and security overhead.

## Cloud Development Environment Layer

### Coder

Best open-source/self-hosted CDE layer for a serious GitHub Codespaces replacement.

Official material:

- https://coder.com/docs
- https://github.com/coder/coder

Use it with SkyeHands CDE or as a parallel workspace manager.

### code-server

Browser-accessible VS Code server.

Official material:

- https://coder.com/docs/code-server
- https://coder.com/docs/code-server/install

Use it if:

- You need a simple browser IDE on a VPS/GPU server.
- You do not need full Coder workspace orchestration.

## Identity Layer

### Keycloak

Open-source identity and access management.

Official material:

- https://www.keycloak.org/
- https://www.keycloak.org/documentation
- https://www.keycloak.org/guides
- https://www.keycloak.org/docs/latest/server_admin/index.html

Use it if:

- You need SSO.
- You need OAuth/OIDC.
- You need centralized user control across Forgejo, CDE, dashboards, and client apps.

## Registry Layer

### Forgejo Package Registry

Use Forgejo's built-in package registry first.

Official material:

- https://forgejo.org/docs/latest/user/packages/
- https://forgejo.org/docs/latest/user/packages/npm/
- https://forgejo.org/docs/latest/user/packages/pypi/
- https://forgejo.org/docs/next/user/packages/container/
- https://forgejo.org/docs/next/user/packages/generic/

### Harbor

Use Harbor when you need enterprise-grade container image registry controls.

Official material:

- https://goharbor.io/
- https://goharbor.io/docs/

### Verdaccio

Use Verdaccio when you want a standalone private npm proxy/registry.

Official material:

- https://verdaccio.org/docs/installation/
- https://verdaccio.org/docs/what-is-verdaccio/
- https://github.com/verdaccio/verdaccio

## Object Storage / Artifact Layer

### MinIO

S3-compatible object storage.

Official/material:

- https://www.min.io/
- https://charts.min.io/

Use it for:

- Build artifacts
- Backups
- Release assets
- Large object storage
- Reliquary expansion lane

## Recommended First Architecture

```txt
Caddy
  ├── Portal static site
  └── Forgejo

Forgejo
  ├── PostgreSQL
  ├── Git over HTTPS
  ├── Git over SSH
  ├── Issues / PRs / wiki / releases
  ├── Package registry
  └── Forgejo Runner

SkyeHands CDE
  └── Connects to Forgejo remotes

Reliquary
  └── Backup/export scripts now, object storage later
```

## Later Enterprise Expansion

```txt
Keycloak → SSO/OIDC
Coder → managed CDE workspaces
Harbor → hardened container registry
Woodpecker/Jenkins → parallel CI lane
MinIO → S3-compatible artifacts/backups
OpenSearch/Meilisearch → deeper code/search indexing
Renovate → dependency update automation
Trivy/Semgrep/Gitleaks → security scanning
```
