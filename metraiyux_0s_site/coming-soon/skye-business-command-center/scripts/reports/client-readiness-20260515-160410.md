# Client Readiness Report

Generated: 2026-05-15T16:04:10+00:00

## Docker services
NAME                   IMAGE                                        COMMAND                  SERVICE           CREATED          STATUS                    PORTS
skye_brain_service     skye-business-command-center-brain-service   "docker-entrypoint.s…"   brain-service     19 minutes ago   Up 19 minutes             127.0.0.1:8099->8099/tcp
skye_espocrm           espocrm/espocrm:latest                       "docker-entrypoint.s…"   espocrm           48 minutes ago   Up 48 minutes             127.0.0.1:8082->80/tcp
skye_espocrm_db        mariadb:10.11                                "docker-entrypoint.s…"   espocrm-db        2 hours ago      Up 2 hours                3306/tcp
skye_formbricks        ghcr.io/formbricks/formbricks:latest         "docker-entrypoint.s…"   formbricks        48 minutes ago   Up 48 minutes             127.0.0.1:8084->3000/tcp
skye_formbricks_db     pgvector/pgvector:pg15                       "docker-entrypoint.s…"   formbricks-db     2 hours ago      Up 2 hours                5432/tcp
skye_freescout         skye-freescout:trusted-hosts                 "/init"                  freescout         35 minutes ago   Up 34 minutes             2020/tcp, 9000/tcp, 10050/tcp, 127.0.0.1:8081->80/tcp
skye_freescout_db      mariadb:10.11                                "docker-entrypoint.s…"   freescout-db      2 hours ago      Up 2 hours                3306/tcp
skye_hub               skye-business-command-center-hub             "/docker-entrypoint.…"   hub               19 minutes ago   Up 19 minutes (healthy)   0.0.0.0:8080->80/tcp
skye_invoiceshelf      invoiceshelf/invoiceshelf:latest             "docker-php-serversi…"   invoiceshelf      48 minutes ago   Up 48 minutes (healthy)   8443/tcp, 9000/tcp, 127.0.0.1:8083->8080/tcp
skye_invoiceshelf_db   mariadb:10.11                                "docker-entrypoint.s…"   invoiceshelf-db   2 hours ago      Up 2 hours                3306/tcp
skye_redis             redis:7-alpine                               "docker-entrypoint.s…"   redis             2 hours ago      Up 2 hours                6379/tcp

## Live env placeholder scan
No common placeholders found in live .env.

Note: example files and compose fallback defaults intentionally contain placeholders.

## Route smoke
Skye Business Command Center Smoke Test
Generated: 2026-05-15T16:04:12+00:00

200 http://localhost:8080/index.html
200 http://localhost:8080/setup.html
200 http://localhost:8080/dashboard.html
200 http://localhost:8080/customer-portal.html
200 http://localhost:8080/support.html
200 http://localhost:8080/intake.html
200 http://localhost:8080/billing.html
200 http://localhost:8080/admin-tools.html
200 http://localhost:8080/surface-map.html
200 http://localhost:8080/command-center.html
200 http://localhost:8080/pricing.html
200 http://localhost:8080/client-onboarding.html
200 http://localhost:8080/client-handoff.html
200 http://localhost:8080/launch.html
200 http://localhost:8080/demo.html
200 http://localhost:8080/proof.html
200 http://localhost:8080/maintenance.html
200 http://localhost:8080/readiness.html
200 http://localhost:8080/brain.html
302 http://localhost:8081
200 http://localhost:8082
302 http://localhost:8083
200 http://localhost:8084
Smoke test passed. See proof/smoke-20260515-160412.txt
✅ Brain page responds
✅ Brain service responds
