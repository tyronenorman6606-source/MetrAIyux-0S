.PHONY: up down logs health provision backup restore-test smoke claims

up:
	docker compose -f deploy/vps-postgres/docker-compose.yml up -d

down:
	docker compose -f deploy/vps-postgres/docker-compose.yml down

logs:
	docker compose -f deploy/vps-postgres/docker-compose.yml logs -f --tail=120

health:
	./cli/citadel health

provision:
	./cli/citadel provision demoapp

backup:
	./cli/citadel backup-now

backup-app:
	./cli/citadel backup-app demoapp

restore-test:
	./cli/citadel restore-test

restore-app-test:
	./cli/citadel restore-app-test demoapp

smoke:
	./cli/citadel smoke-all

claims:
	./cli/citadel claims


validate-env:
	./scripts/validate-env.sh

skygate-bridge-proof:
	./cli/citadel skygate-bridge-proof

vps-only-closure-proof:
	./cli/citadel vps-only-closure-proof

dashboard:
	docker compose -f deploy/vps-postgres/docker-compose.yml up -d dashboard

object-backup-sync:
	./reliquary/sync-object-backups.sh


jobs:
	./cli/citadel jobs

enqueue-health:
	./cli/citadel enqueue-job health

job-runner-once:
	docker compose -f deploy/vps-postgres/docker-compose.yml run --rm -e JOB_RUNNER_ONCE=true job-runner

browser-proof:
	cd proof/browser && npm install && npm test

backup-integrity:
	./reliquary/verify-backup-integrity.sh


policy-check:
	./tools/policy-check.sh

backup-manifest:
	./reliquary/generate-backup-manifest.sh

service-catalog-export:
	./tools/export-service-catalog.sh


architecture-guard:
	./tools/public-architecture-guard.sh

site-build:
	cd site && npm run build


release-self-audit:
	./tools/release-self-audit.sh

release-manifest:
	./tools/generate-release-manifest.sh 0.8.0

deployment-checklist:
	./tools/generate-deployment-checklist.sh citadeldb

install-local:
	./scripts/install-local.sh

first-production-pass:
	./scripts/first-production-pass.sh


vps-preflight:
	./scripts/vps-preflight.sh

prod-up:
	docker compose -f deploy/vps-postgres/docker-compose.yml -f deploy/vps-postgres/docker-compose.production.yml up -d

prod-down:
	docker compose -f deploy/vps-postgres/docker-compose.yml -f deploy/vps-postgres/docker-compose.production.yml down

final-rc-smoke:
	./tools/final-rc-smoke.sh

package-integrity:
	./tools/package-integrity-proof.sh

repo-hygiene:
	./tools/repo-hygiene-scan.sh

public-surface-scan:
	./tools/public-surface-scan.sh

final-release-gate:
	./tools/final-release-gate.sh

final-package-seal:
	./tools/final-package-seal.sh

webapp-proof:
	./tools/webapp-proof.sh

site-preview:
	cd site && npm install && npm run preview

ai-debug-preflight:
	./tools/ai-debug-preflight.sh

launchpad-proof:
	./tools/launchpad-proof.sh

guided-ops-proof:
	./tools/guided-ops-proof.sh

setup-wizard-proof:
	./tools/setup-wizard-proof.sh

dashboard-route-proof:
	./tools/dashboard-route-proof.sh

app-onboarding-proof:
	./tools/app-onboarding-proof.sh

app-lifecycle-proof:
	./tools/app-lifecycle-proof.sh

self-service-console-proof:
	./tools/self-service-console-proof.sh

platform-closure-proof:
	./tools/platform-closure-proof.sh

commercial-closure-proof:
	./tools/commercial-closure-proof.sh

live-gate-hardening-proof:
	./tools/live-gate-hardening-proof.sh

truth-correction-proof:
	./tools/truth-correction-proof.sh

hard-proof-truth-scan:
	./tools/hard-proof-truth-scan.sh

runtime-integrity-scan:
	./tools/runtime-integrity-scan.sh

behavioral-proof:
	./tools/behavioral-proof.sh

live-stack-e2e:
	./tools/live-stack-e2e.sh

route-protection-proof:
	./tools/route-protection-proof.sh

handler-guard-proof:
	./tools/handler-guard-proof.sh

worker-allowlist-proof:
	./tools/worker-allowlist-proof.sh

database-lifecycle-proof:
	./tools/database-lifecycle-proof.sh

gateway-sql-console-proof:
	./tools/gateway-sql-console-proof.sh

generate-live-e2e-env:
	./tools/generate-live-e2e-env.sh

schema-query-consistency-proof:
	./tools/schema-query-consistency-proof.sh

sql-policy-negative-proof:
	./tools/sql-policy-negative-proof.sh

postgres-ddl-safety-proof:
	./tools/postgres-ddl-safety-proof.sh

migration-init-parity-proof:
	./tools/migration-init-parity-proof.sh

provisioning-ddl-proof:
	./tools/provisioning-ddl-proof.sh

gateway-worker-job-parity-proof:
	./tools/gateway-worker-job-parity-proof.sh

runtime-reference-proof:
	./tools/runtime-reference-proof.sh

lifecycle-packet-composition-proof:
	./tools/lifecycle-packet-composition-proof.sh

route-contract-proof:
	./tools/route-contract-proof.sh

express-async-error-proof:
	./tools/express-async-error-proof.sh

mutating-route-audit-proof:
	./tools/mutating-route-audit-proof.sh
