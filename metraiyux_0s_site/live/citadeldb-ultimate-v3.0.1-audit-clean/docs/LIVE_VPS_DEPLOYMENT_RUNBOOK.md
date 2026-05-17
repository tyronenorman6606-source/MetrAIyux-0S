# Live VPS Deployment Runbook

## 1. Prepare server

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin postgresql-client openssl curl jq
sudo usermod -aG docker $USER
```

Log out/in after adding Docker group.

## 2. Install CitadelDB

```bash
sudo mkdir -p /opt/citadeldb
sudo chown -R $USER:$USER /opt/citadeldb
cp -R . /opt/citadeldb
cd /opt/citadeldb
cp .env.production.example .env
nano .env
```

## 3. Preflight

```bash
./scripts/vps-preflight.sh
./cli/citadel validate-env
```

## 4. Start private production stack

```bash
docker compose -f deploy/vps-postgres/docker-compose.yml -f deploy/vps-postgres/docker-compose.production.yml up -d
```

## 5. First proof pass

```bash
./scripts/first-production-pass.sh
```

## 6. Install timers

```bash
sudo cp deploy/systemd/*.service deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now citadeldb.service
sudo systemctl enable --now citadeldb-backup.timer
sudo systemctl enable --now citadeldb-restore-test.timer
sudo systemctl enable --now citadeldb-policy-check.timer
```

## 7. Dashboard access

Use SSH tunnel:

```bash
ssh -L 7413:127.0.0.1:7413 user@server
```

## Production claim gate

Do not claim production ready until:

✅ first production pass receipt exists  
✅ restore-test receipt exists  
✅ policy-check passes  
✅ architecture guard passes  
✅ app write smoke passes for at least one app  
