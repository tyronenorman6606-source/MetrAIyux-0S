
# CitadelDB Ultimate

## Sovereign Database Command Infrastructure by Skyes Over London

Part of the **SoveReign13 Infrastructure Family** under **SOLEnterprises International Nexus & Holdings**.

CitadelDB is a company-owned database command platform for private infrastructure, proof-backed operations, app database provisioning, backups, restores, migrations, routing, and recovery.

The architecture is defined by Skyes Over London:

```text
Citadel Core + Reliquary + SceptR + Veyra3.1 + Aegis + SkyLedger
```

External open-source infrastructure may be used as replaceable runtime implementation, but it does not define the public architecture, dashboard language, control plane, or product identity.



SoveReign13 sovereign database platform foundation.

CitadelDB Ultimate is not a fork mashup. It is a clean control-plane-first platform that studies and composes the strongest patterns from:

- hosted-database providers: compute/storage separation, branching concepts, WAL/storage service architecture
- optional service-pack: developer experience, self-hosted service pack, Studio/API/realtime/storage packaging
- Kubernetes HA Postgres: Kubernetes-native PostgreSQL HA, replicas, lifecycle management, failover
- pgBackRest/Barman-style operations: backup, WAL archive, PITR, restore discipline
- PgBouncer: connection pooling
- Prometheus/Grafana/Loki: visibility and operational proof

The product principle:

```text
Do not combine upstream repos into Frankenstein code.
Study upstream systems.
Extract patterns.
Own the control plane.
Compose proven engines.
Prove every production claim with smoke commands and receipts.
```

## Platform shape

```text
CitadelDB Ultimate
├─ control-plane/          # Admin API, app provisioning, audit, receipts
├─ cli/                    # citadel command runner
├─ engines/                # vps-postgres, kubernetes-ha, service-pack, research-lab
├─ deploy/                 # Docker Compose, Kubernetes manifests, monitoring
├─ reliquary/              # backup/restore/export/rollback ledger
├─ sceptr/                 # migration/provision/smoke command layer
├─ veyra/                  # routing/tunnel/service-discovery notes
├─ adapters/               # app DB adapters
├─ research/               # upstream extraction notes, do-not-copy ledger
├─ claims/                 # public/internal claims ledger
└─ proof/                  # generated proof output
```

## Engine lanes

### Lane 1: VPS Postgres

The fast serious path. Best for replacing hosted-database providers immediately.

Includes:

- PostgreSQL
- PgBouncer
- pgBackRest-ready configuration
- Backup/restore scripts
- Gateway API
- CLI
- Audit/receipts

### Lane 2: VPS Postgres + replica

Paid-client serious path.

Adds:

- streaming replica notes
- failover runbook
- replica health checks
- backup node pattern

### Lane 3: Kubernetes HA Postgres

Highest-level HA path when Kubernetes is available.

Adds:

- Kubernetes HA Postgres cluster manifests
- 3-instance HA cluster
- PgBouncer pooler manifest
- backup object-store placeholders
- failover/switchover runbook

### Lane 4: Optional Service Pack

Developer-product service pack.

Adds optional packaging for:

- Studio
- REST API
- Realtime
- Storage
- Auth integration boundary

CitadelDB does not depend on optional service-pack. optional service-pack is optional.

### Lane 5: Hosted Database Research Lab

Research/advanced lane for serverless Postgres ideas.

This lane is explicitly non-production in v0.2. It exists to study:

- compute nodes
- pageserver/safekeeper concepts
- branching workflows
- storage/compute split
- serverless connection patterns

## Quick start: serious VPS lane

```bash
cp .env.example .env
nano .env
docker compose -f deploy/vps-postgres/docker-compose.yml up -d
./cli/citadel health
./cli/citadel provision skyeroutes
./cli/citadel backup-now
./cli/citadel restore-test
./cli/citadel smoke-all
```

## Quick start: Kubernetes HA Postgres lane

Requires Kubernetes, kubectl, and Kubernetes HA Postgres installed.

```bash
kubectl apply -f deploy/kubernetes-ha/namespace.yaml
kubectl apply -f deploy/kubernetes-ha/cluster.yaml
kubectl apply -f deploy/kubernetes-ha/pooler.yaml
kubectl apply -f deploy/kubernetes-ha/backup-schedule.yaml
```

## Current truth status

This repository is a high-level foundation package generated for local/VPS/Kubernetes deployment. It includes real scripts, manifests, adapter contracts, gateway routes, receipts, and runbooks.

It has not been executed against your live VPS or Kubernetes cluster from this chat. Production claims require running the proof commands in `proof/PROOF_RUNBOOK.md`.

## No-theater rule

A claim is not complete unless there is:

1. code/config present,
2. command to execute it,
3. receipt or output generated,
4. failure condition documented.

## v0.3 additions

CitadelDB Ultimate v0.3 adds the first serious operator layer and migration tooling:

- Operator dashboard app
- Gateway readiness/capacity JSON endpoints
- hosted-database-to-Citadel migration scripts
- Engine registry manifest
- Backup policy manifests
- App connection manifest generator
- Load-test scaffold
- Disaster recovery drills
- Production readiness checklist
- Pricing/capacity planner

## v0.4 additions

CitadelDB Ultimate v0.4 upgrades the operator path from passive viewing into controlled operations:

- Dashboard forms for app provisioning, backup receipt creation, and readiness inspection
- Gateway action endpoints for command receipts and migration registration
- Object storage backup sync scaffold
- App onboarding packet generator
- Environment validation script
- Rollback plan template and receipts
- Service catalog for attached platforms
- Upgrade planner for moving from VPS to Kubernetes HA Postgres
- First dashboard public asset polish

## v0.5 additions

CitadelDB Ultimate v0.5 adds the safe operations loop:

- Operator job queue schema
- Gateway job enqueue/list/detail endpoints
- Allowlisted job worker
- Dashboard job queue page
- Dashboard safe action enqueue forms
- Browser proof scaffold with Playwright
- Migration for v0.5 schema
- PITR and WAL proof runbook
- Database maintenance runbook
- Backup integrity verifier
- Job receipt writer

## v0.6 additions

CitadelDB Ultimate v0.6 adds the internal-platform hardening layer:

- Tenant/client registry schema
- App ownership and environment mapping
- Credential rotation job scaffolding
- Policy checker script
- Cutover automation for hosted-database providers migrations
- Dashboard security posture page
- Backup manifest generator
- Object-backup manifest format
- Tenant/app service catalog exports
- Production launch checklist
- Incident response runbook
- App write-smoke template runner

## v0.8 additions

CitadelDB Ultimate v0.8 adds the productized release layer:

- Branded landing site expanded into a multi-section product surface
- Operator install script
- Production environment template
- Deployment checklist generator
- Release manifest generator
- Company-facing docs index
- Internal-only docs index
- Dashboard footer and stronger Skyes/SOLEnterprises identity
- Public claims pack
- Sales-safe product language
- Self-audit release script

## v0.9 additions

CitadelDB Ultimate v0.9 adds the VPS operations layer:

- Production Compose override
- systemd unit templates
- cron/timer templates for backup, restore-test, policy check, and service catalog export
- upstream-auth boundary documentation and gateway header contract
- private dashboard exposure guide
- live VPS deployment runbook
- preflight installer
- release gate matrix
- ops receipts directory structure
- stronger environment/profile separation

## v1.0 RC additions

CitadelDB Ultimate v1.0 Release Candidate adds the final release-hardening layer:

- Version truth file
- Release acceptance checklist
- Package integrity proof script
- Public surface scanner
- Repository hygiene scanner
- Final smoke orchestrator
- App cutover acceptance checklist
- Backup restore acceptance checklist
- Operator dashboard acceptance checklist
- Production claims acceptance checklist
- Release candidate manifest

## v1.0 Final additions

CitadelDB Ultimate v1.0 Final adds the release-final layer:

- Final release notes
- Final public claims gate
- Final proof gap ledger
- Live deployment acceptance packet
- Production install quickstart
- Release lock manifest
- Final package seal script
- Operator handoff guide
- Final go/no-go checklist

## v1.1 Branded Web/App additions

CitadelDB Ultimate v1.1 rolls the new logo and branded website into the app package:

- CitadelDB Ultimate logo stored in `brand/assets/`
- Public landing website in `site/`
- Operator dashboard uses the CitadelDB logo
- Website launches into the operator app through `/app`
- Dashboard exposes public landing routes when desired
- PWA manifest and AI/search summary included
- Netlify/static deployment config for the branded site
- App/web integration notes and proof checklist

## v1.2 Dashboard + AI Assistant additions

CitadelDB Ultimate v1.2 removes the need to understand command-line database operations for common workflows:

- Dashboard app database wizard
- Dashboard-generated connection instructions
- Dashboard app write-smoke workflow
- Dashboard backup/restore proof buttons through safe jobs
- Gateway app connection detail endpoint
- Gateway app connection environment template endpoint
- OpenAI/Gemini debug assistant panel
- Server-side AI provider adapters
- AI debug context builder
- AI safety/secrets redaction layer
- Plain-English docs for "connect my app"

## v1.3 Database Launchpad additions

CitadelDB Ultimate v1.3 adds the Database Launchpad layer:

- Dashboard Database Launchpad
- Credential rotation endpoint
- Dashboard credential rotation flow
- Server-side DATABASE_URL connection tester
- Server-side real write-smoke endpoint using pasted DATABASE_URL
- App setup packet generator endpoint
- Dashboard app setup packet page
- AI debug can receive smoke/test results as context
- Plain-English database launch checklist
- No-code launchpad proof script

## v1.4 Guided Ops additions

CitadelDB Ultimate v1.4 adds guided operator workflows:

- First-run dashboard onboarding page
- Setup checklist endpoint and dashboard page
- One-click safe proof actions page
- Diagnostic bundle generator
- AI-ready diagnostic bundle redaction
- Backup/restore proof dashboard shortcuts
- Database Launchpad quick actions
- Operator mode docs
- Guided Ops acceptance checklist
- Guided Ops proof script

## v1.5 Setup Wizard + Proof additions

CitadelDB Ultimate v1.5 adds the setup wizard and proof hardening layer:

- Dashboard Setup Wizard page
- Server-side secret generation helper endpoint
- `.env` readiness checklist endpoint
- Downloadable setup plan from dashboard
- Guided first-app database path
- Browser proof tests for onboarding, guided ops, launchpad, and AI debug pages
- Smoke proof receipt writer for dashboard route inventory
- Setup wizard documentation
- v1.5 acceptance checklist

## v1.6 App Onboarding additions

CitadelDB Ultimate v1.6 adds repeatable app/client onboarding:

- App onboarding dashboard page
- App framework setup templates
- App migration checklist generator
- App proof packet generator
- Framework-specific DATABASE_URL instructions
- App onboarding packet endpoint
- App onboarding proof script
- Client-safe app database handoff docs
- App migration acceptance checklist

## v1.7 End-to-End Lifecycle additions

CitadelDB Ultimate v1.7 expands from onboarding into full app database lifecycle:

- App lifecycle dashboard
- App migration plan endpoint
- App migration job enqueue endpoint
- App backup action endpoint
- App restore-test action endpoint
- App rollback packet endpoint
- App lifecycle packet endpoint
- Dashboard migration plan view
- Dashboard per-app backup/restore proof buttons
- Dashboard rollback packet page
- End-to-end lifecycle docs and proof script

## v1.8 Self-Service SQL Console additions

CitadelDB Ultimate v1.8 adds the hosted-database-style user console core:

- User-facing self-service database console
- Project/workspace model
- User-owned database provisioning endpoint
- SQL console endpoint
- SQL safety policy
- Query history table
- Query result display in dashboard
- Project/database usage overview
- Connection string copy panel
- Quota policy scaffold
- Self-service console docs and proof script

## v1.9 Platform Closure additions

CitadelDB Ultimate v1.9 adds the sellable platform closure layer:

- User/account model scaffold
- Team/member/project ownership schema
- Billing plan and quota schema
- Usage metering schema
- Table browser endpoints
- Schema/table introspection endpoints
- Safe row preview endpoint
- Quota enforcement helper
- Usage snapshot endpoint
- Billing/plan dashboard
- Table Browser dashboard
- Platform closure ledger
- Competitive gap closure matrix
- v1.9 proof script

## v2.0 Commercial Control Plane additions

CitadelDB Ultimate v2.0 adds the commercial control-plane closure layer:

- Upstream auth subject/team guard helpers
- Billing customer/subscription/payment schema
- Stripe-compatible webhook scaffold with signature boundary
- Subscription entitlement endpoint
- Quota enforcement tied to active subscription status
- Database branch request schema
- Branch/clone workflow scaffold
- PITR/branch proof packet
- Commercial readiness dashboard
- hosted-platform-parity closure ledger
- Production launch gate matrix
- v2.0 commercial closure proof script

## v2.1 Live Gate Hardening additions

CitadelDB Ultimate v2.1 hardens the live-gate layer:

- Entitlement guard helper for paid/self-service routes
- Subscription blocking applied to self-service database provisioning
- Usage counter increment helpers
- Query usage recording during SQL console execution
- Branch worker scaffold with receipt status
- Branch proof packet endpoint
- Live gate dashboard
- Live gate proof ledger
- Paid route acceptance checklist
- v2.1 live gate hardening proof script

## v2.2 Truth Correction additions

CitadelDB Ultimate v2.2 is a correction pass.

It adds fewer shiny surfaces and more truth/closure controls:

- Overclaim audit ledger
- Protected route registry
- Paid-route guard expansion beyond provisioning
- SQL/table/branch route guard hooks
- Raw-body Stripe webhook verification fix
- Branch clone worker script using pg_dump/psql
- Branch live proof helper
- Live gate protected-route status endpoint
- Hard proof truth scanner
- v2.2 truth correction proof script

## v2.3 Runtime Integrity Repair

This is not a feature pass. This is a repair/proof pass.

- Added runtime integrity scanner.
- Added Node syntax checker for gateway, dashboard, workers, and scripts.
- Added route collision / placeholder detector.
- Added Express raw-body verification check.
- Added guarded-route verification check.
- Added package repair ledger.
- Added proof artifact written during package build.
- Removed the habit of treating scaffold as closure.

## v2.4 Behavioral Proof Repair

This pass raises proof from syntax to behavior:

- Adds HTTP behavioral proof runner.
- Adds route manifest for gateway/dashboard expectations.
- Adds dependency/install proof capture.
- Adds dashboard static smoke runner.
- Adds gateway smoke runner with DB-unavailable honesty.
- Adds behavioral proof report into package.
- Fixes dashboard/gateway route issues discovered by boot attempts.

## v2.5 Neglected Core Closure

This pass addresses core work that should not have been pushed back to the operator:

- Adds live stack E2E proof runner.
- Adds database lifecycle E2E proof runner.
- Adds missing worker handlers for policy-check and backup-manifest.
- Adds branch clone job handler scaffold wired through worker.
- Adds paid-route guards to AI debug, guided proof actions, lifecycle actions, credential rotation, and setup secret generation.
- Adds route protection proof script.
- Adds real stack closure acceptance ledger.
- Adds proof report from runtime scanner after patching.

## v2.6 Handler Proof Closure

This pass improves proof quality again:

- Adds handler-level route guard scanner instead of loose grep.
- Adds DB lifecycle proof script for an existing DATABASE_URL.
- Adds SQL console behavior proof script using Gateway HTTP.
- Adds branch worker dry-run validation and live-run instructions.
- Adds worker allowlist proof scanner.
- Adds stack env generator for live E2E.
- Adds v2.6 proof report.

## v2.8 Postgres Provisioning Closure

This pass repairs Postgres provisioning paths:

- Docker init SQL now mirrors every `migrations/citadel-core` migration.
- `/admin/apps` no longer runs `CREATE DATABASE` inside a transaction.
- Self-service provisioning checks role/database existence before creation.
- Gateway job allowlist now matches worker allowlist.
- `app_credentials.secret_hint` schema mismatch repaired.
- Added migration/init parity proof.
- Added provisioning DDL proof.
- Added Gateway/worker job parity proof.

## v2.9 Runtime Reference Closure

This pass removes a hidden runtime placeholder:

- Replaced `fetchLocalJson(...)` lifecycle packet placeholder with real internal packet composition.
- Lifecycle packet now queries app, jobs, backups, restores, and audit receipts directly.
- Added runtime-reference proof.
- Added lifecycle-packet composition proof.
- Removed stale `2.2.0` server version labels.

## v3.0 Route Contract Closure

This pass closes another control-plane class:

- Added route contract manifest.
- Added route contract proof.
- Added Express 4 async route wrapper.
- Added centralized Zod/500 error middleware.
- Added baseline admin mutation audit middleware.
- Added mutating route audit proof.

## v3.0.1 Audit Clean Closure

Independent audit cleanup pass:

- Verified ZIP contains no `node_modules`.
- Verified package-lock root versions are current.
- Verified route contract still matches Gateway routes.
- Verified no-install proof subset passes.
