# Client Readiness Report

Generated: 2026-05-15T14:13:38+00:00

## Docker services
NAME                   IMAGE                                        COMMAND                  SERVICE           CREATED          STATUS                    PORTS
skye_brain_service     skye-business-command-center-brain-service   "docker-entrypoint.s…"   brain-service     19 minutes ago   Up 19 minutes             0.0.0.0:8099->8099/tcp, [::]:8099->8099/tcp
skye_espocrm           espocrm/espocrm:latest                       "docker-entrypoint.s…"   espocrm           14 minutes ago   Up 14 minutes             0.0.0.0:8082->80/tcp, [::]:8082->80/tcp
skye_espocrm_db        mariadb:10.11                                "docker-entrypoint.s…"   espocrm-db        19 minutes ago   Up 19 minutes             3306/tcp
skye_formbricks        ghcr.io/formbricks/formbricks:latest         "docker-entrypoint.s…"   formbricks        3 minutes ago    Up 3 minutes              0.0.0.0:8084->3000/tcp, [::]:8084->3000/tcp
skye_formbricks_db     pgvector/pgvector:pg15                       "docker-entrypoint.s…"   formbricks-db     11 minutes ago   Up 11 minutes             5432/tcp
skye_freescout         tiredofit/freescout:latest                   "/init"                  freescout         14 minutes ago   Up 14 minutes             2020/tcp, 9000/tcp, 10050/tcp, 0.0.0.0:8081->80/tcp, [::]:8081->80/tcp
skye_freescout_db      mariadb:10.11                                "docker-entrypoint.s…"   freescout-db      19 minutes ago   Up 19 minutes             3306/tcp
skye_hub               skye-business-command-center-hub             "/docker-entrypoint.…"   hub               13 minutes ago   Up 13 minutes (healthy)   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
skye_invoiceshelf      invoiceshelf/invoiceshelf:latest             "docker-php-serversi…"   invoiceshelf      11 minutes ago   Up 11 minutes (healthy)   8443/tcp, 9000/tcp, 0.0.0.0:8083->8080/tcp, [::]:8083->8080/tcp
skye_invoiceshelf_db   mariadb:10.11                                "docker-entrypoint.s…"   invoiceshelf-db   19 minutes ago   Up 19 minutes             3306/tcp
skye_redis             redis:7-alpine                               "docker-entrypoint.s…"   redis             3 minutes ago    Up 3 minutes              6379/tcp

## Live env placeholder scan
No common placeholders found in live .env.

Note: example files and compose fallback defaults intentionally contain placeholders.

## Route smoke
Skye Business Command Center Smoke Test
Generated: 2026-05-15T14:13:40+00:00

200 http://localhost:8080/index.html
200 http://localhost:8080/setup.html
200 http://localhost:8080/dashboard.html
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
403 http://localhost:8081
200 http://localhost:8082
200 http://localhost:8083
200 http://localhost:8084
Smoke test passed. See proof/smoke-20260515-141340.txt
✅ Brain page responds
✅ Brain service responds
