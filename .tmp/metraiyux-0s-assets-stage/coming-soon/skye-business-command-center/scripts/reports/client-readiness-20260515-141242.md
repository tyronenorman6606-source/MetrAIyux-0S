# Client Readiness Report

Generated: 2026-05-15T14:12:42+00:00

## Docker services
NAME                   IMAGE                                        COMMAND                  SERVICE           CREATED          STATUS                    PORTS
skye_brain_service     skye-business-command-center-brain-service   "docker-entrypoint.s…"   brain-service     18 minutes ago   Up 18 minutes             0.0.0.0:8099->8099/tcp, [::]:8099->8099/tcp
skye_espocrm           espocrm/espocrm:latest                       "docker-entrypoint.s…"   espocrm           13 minutes ago   Up 13 minutes             0.0.0.0:8082->80/tcp, [::]:8082->80/tcp
skye_espocrm_db        mariadb:10.11                                "docker-entrypoint.s…"   espocrm-db        18 minutes ago   Up 18 minutes             3306/tcp
skye_formbricks        ghcr.io/formbricks/formbricks:latest         "docker-entrypoint.s…"   formbricks        2 minutes ago    Up 2 minutes              0.0.0.0:8084->3000/tcp, [::]:8084->3000/tcp
skye_formbricks_db     pgvector/pgvector:pg15                       "docker-entrypoint.s…"   formbricks-db     10 minutes ago   Up 10 minutes             5432/tcp
skye_freescout         tiredofit/freescout:latest                   "/init"                  freescout         13 minutes ago   Up 13 minutes             2020/tcp, 9000/tcp, 10050/tcp, 0.0.0.0:8081->80/tcp, [::]:8081->80/tcp
skye_freescout_db      mariadb:10.11                                "docker-entrypoint.s…"   freescout-db      18 minutes ago   Up 18 minutes             3306/tcp
skye_hub               skye-business-command-center-hub             "/docker-entrypoint.…"   hub               12 minutes ago   Up 12 minutes (healthy)   0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
skye_invoiceshelf      invoiceshelf/invoiceshelf:latest             "docker-php-serversi…"   invoiceshelf      10 minutes ago   Up 10 minutes (healthy)   8443/tcp, 9000/tcp, 0.0.0.0:8083->8080/tcp, [::]:8083->8080/tcp
skye_invoiceshelf_db   mariadb:10.11                                "docker-entrypoint.s…"   invoiceshelf-db   18 minutes ago   Up 18 minutes             3306/tcp
skye_redis             redis:7-alpine                               "docker-entrypoint.s…"   redis             2 minutes ago    Up 2 minutes              6379/tcp

## Placeholder scan
docker-compose.yml:14:      PUBLIC_SUPPORT_EMAIL: ${PUBLIC_SUPPORT_EMAIL:-support@example.com}
docker-compose.yml:41:      MYSQL_PASSWORD: ${FREESCOUT_DB_PASSWORD:-change-me-freescout}
docker-compose.yml:42:      MYSQL_ROOT_PASSWORD: ${FREESCOUT_DB_PASSWORD:-change-me-freescout-root}
docker-compose.yml:58:      DB_PASS: ${FREESCOUT_DB_PASSWORD:-change-me-freescout}
docker-compose.yml:60:      ADMIN_EMAIL: ${PUBLIC_SUPPORT_EMAIL:-support@example.com}
docker-compose.yml:61:      ADMIN_PASS: ${FREESCOUT_ADMIN_PASSWORD:-change-me-admin}
docker-compose.yml:74:      MYSQL_PASSWORD: ${ESPOCRM_DB_PASSWORD:-change-me-espocrm}
docker-compose.yml:75:      MYSQL_ROOT_PASSWORD: ${ESPOCRM_DB_PASSWORD:-change-me-espocrm-root}
docker-compose.yml:90:      ESPOCRM_DATABASE_PASSWORD: ${ESPOCRM_DB_PASSWORD:-change-me-espocrm}
docker-compose.yml:94:      ESPOCRM_ADMIN_PASSWORD: ${ESPOCRM_ADMIN_PASSWORD:-change-me-admin}
docker-compose.yml:105:      MYSQL_PASSWORD: ${INVOICESHELF_DB_PASSWORD:-change-me-invoiceshelf}
docker-compose.yml:106:      MYSQL_ROOT_PASSWORD: ${INVOICESHELF_DB_PASSWORD:-change-me-invoiceshelf-root}
docker-compose.yml:121:      APP_KEY: ${INVOICESHELF_APP_KEY:-base64:REPLACE_ME_WITH_INVOICESHELF_KEY}
docker-compose.yml:127:      DB_PASSWORD: ${INVOICESHELF_DB_PASSWORD:-change-me-invoiceshelf}
docker-compose.yml:129:      MAIL_HOST: ${SMTP_HOST:-smtp.example.com}
docker-compose.yml:134:      MAIL_FROM_ADDRESS: ${SMTP_FROM:-support@example.com}
docker-compose.yml:144:      REDIS_PASSWORD: ${REDIS_PASSWORD:-change-me-redis}
docker-compose.yml:155:      POSTGRES_PASSWORD: ${FORMBRICKS_DB_PASSWORD:-change-me-formbricks}
docker-compose.yml:169:      DATABASE_URL: postgresql://formbricks:${FORMBRICKS_DB_PASSWORD:-change-me-formbricks}@formbricks-db:5432/formbricks?schema=public
docker-compose.yml:170:      REDIS_URL: redis://:${REDIS_PASSWORD:-change-me-redis}@redis:6379
docker-compose.yml:173:      NEXTAUTH_SECRET: ${FORMBRICKS_NEXTAUTH_SECRET:-REPLACE_ME_LONG_RANDOM_SECRET}
docker-compose.yml:174:      ENCRYPTION_KEY: ${FORMBRICKS_ENCRYPTION_KEY:-REPLACE_ME_32_CHAR_MINIMUM_SECRET}
docker-compose.yml:175:      CRON_SECRET: ${FORMBRICKS_CRON_SECRET:-REPLACE_ME_LONG_RANDOM_SECRET}
docker-compose.yml:176:      MAIL_FROM: ${SMTP_FROM:-support@example.com}
docker-compose.yml:177:      SMTP_HOST: ${SMTP_HOST:-smtp.example.com}
deploy/profiles/.env.production.example:2:# Copy to .env and replace every CHANGE_ME value before launch.
deploy/profiles/.env.production.example:8:PUBLIC_PHONE=CHANGE_ME
deploy/profiles/.env.production.example:17:FREESCOUT_DB_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:18:ESPOCRM_DB_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:19:INVOICESHELF_DB_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:20:FORMBRICKS_DB_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:21:REDIS_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:22:FREESCOUT_ADMIN_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:24:ESPOCRM_ADMIN_PASSWORD=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:25:INVOICESHELF_APP_KEY=base64:CHANGE_ME_VALID_LARAVEL_KEY
deploy/profiles/.env.production.example:26:FORMBRICKS_ENCRYPTION_KEY=CHANGE_ME_32_CHARS_MINIMUM
deploy/profiles/.env.production.example:27:FORMBRICKS_NEXTAUTH_SECRET=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:28:FORMBRICKS_CRON_SECRET=CHANGE_ME_32_PLUS_CHARS
deploy/profiles/.env.production.example:29:SMTP_HOST=CHANGE_ME
deploy/profiles/.env.production.example:31:SMTP_USER=CHANGE_ME
deploy/profiles/.env.production.example:32:SMTP_PASSWORD=CHANGE_ME
deploy/profiles/.env.production.example:47:OPENAI_API_KEY=CHANGE_ME_IF_USING_OPENAI
deploy/caddy/Caddyfile.example:25:# brain.example.com {
deploy/nginx/reverse-proxy.example.conf:2:server { listen 80; server_name ops.example.com; location / { proxy_pass http://127.0.0.1:8080; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
deploy/nginx/reverse-proxy.example.conf:3:server { listen 80; server_name support.example.com; location / { proxy_pass http://127.0.0.1:8081; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
deploy/nginx/reverse-proxy.example.conf:4:server { listen 80; server_name crm.example.com; location / { proxy_pass http://127.0.0.1:8082; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
deploy/nginx/reverse-proxy.example.conf:5:server { listen 80; server_name billing.example.com; location / { proxy_pass http://127.0.0.1:8083; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
deploy/nginx/reverse-proxy.example.conf:6:server { listen 80; server_name forms.example.com; location / { proxy_pass http://127.0.0.1:8084; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
deploy/nginx/reverse-proxy.example.conf:9:# server { listen 80; server_name brain.example.com; location / { proxy_pass http://127.0.0.1:8099; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; } }
docs/proof/PRODUCTION_ACCEPTANCE_LEDGER.md:10:☐ `.env` contains no CHANGE_ME or placeholder secrets.
templates/demo/demo-crm-leads.csv:2:Jordan,Reed,jordan@example.com,555-0101,Reed Renovations,Website Quote Form,New,3500,Call within 24 hours
templates/demo/demo-crm-leads.csv:3:Maya,Collins,maya@example.com,555-0102,Collins Cleaning,Referral,Qualified,1200,Send estimate
templates/demo/demo-crm-leads.csv:4:Andre,West,andre@example.com,555-0103,West Logistics,Support Inquiry,Proposal,7800,Follow up Friday

Placeholders found. Production is not ready until these are replaced.

## Route smoke
Skye Business Command Center Smoke Test
Generated: 2026-05-15T14:12:44+00:00

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
Smoke test passed. See proof/smoke-20260515-141244.txt
✅ Brain page responds
✅ Brain service responds
