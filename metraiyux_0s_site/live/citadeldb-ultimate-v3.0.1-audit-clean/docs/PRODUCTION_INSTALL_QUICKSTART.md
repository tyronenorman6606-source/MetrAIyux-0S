# Production Install Quickstart

## 1. Copy package to server

```bash
sudo mkdir -p /opt/citadeldb
sudo chown -R $USER:$USER /opt/citadeldb
cp -R . /opt/citadeldb
cd /opt/citadeldb
```

## 2. Configure env

```bash
cp .env.production.example .env
nano .env
```

Replace every secret.

## 3. Preflight

```bash
./cli/citadel vps-preflight
./cli/citadel validate-env
```

## 4. Start

```bash
make prod-up
```

## 5. Proof

```bash
./scripts/first-production-pass.sh
./cli/citadel final-release-gate
```

## 6. Private dashboard

```bash
ssh -L 7413:127.0.0.1:7413 user@server
```

Open:

```text
http://127.0.0.1:7413
```
