# SkyeVault Git Remote Deploy

This deploys the Git-level SkyeVault remote with persistent bare repositories, Gate token introspection, workspace isolation, branch policy, quota accounting, verified snapshots, bundle exports, and repo neural-map events.

## Container deploy

```bash
export SKYEVAULT_GATE_INTROSPECT_URL="https://skyesol.netlify.app/auth-introspect"
docker compose -f deploy/skyevault-git-remote/compose.yml up -d --build
curl -fsS http://127.0.0.1:8787/health
```

The Compose volume `skyevault_git_remote_data` holds repos, exports, ledgers, snapshots, branch policy, and neural-map files across restarts.

## Systemd deploy

```bash
sudo useradd --system --home-dir /var/lib/skyevault-git-remote --create-home --shell /usr/sbin/nologin skyevault
sudo mkdir -p /etc/skyevault /var/lib/skyevault-git-remote /opt/metraiyux-0s/.skyevault-out
sudo chown -R skyevault:skyevault /var/lib/skyevault-git-remote /opt/metraiyux-0s/.skyevault-out
sudo install -m 0644 deploy/skyevault-git-remote/systemd/skyevault-git-remote.service /etc/systemd/system/skyevault-git-remote.service
sudo install -m 0600 /dev/stdin /etc/skyevault/git-remote.env <<'ENV'
SKYEVAULT_GATE_INTROSPECT_URL=https://skyesol.netlify.app/auth-introspect
ENV
sudo systemctl daemon-reload
sudo systemctl enable --now skyevault-git-remote
systemctl status skyevault-git-remote --no-pager
```

Developers clone and push with Gate-issued tokens through the SkyeVault CLI:

```bash
test -n "$GATE_TOKEN"
node tools/skyevault-cli.mjs login --remote-url=http://127.0.0.1:8787 --token="$GATE_TOKEN" --workspace=acme
node tools/skyevault-cli.mjs clone app ./app
cd app
node ../tools/skyevault-cli.mjs remote-add --repo=app --name=vault
git push vault main
```

Operator snapshot and restore:

```bash
node tools/skyevault-git-remote-maintenance.mjs snapshot --storage-root=/var/lib/skyevault-git-remote
node tools/skyevault-git-remote-maintenance.mjs verify --storage-root=/var/lib/skyevault-git-remote --snapshot=latest
node tools/skyevault-git-remote-maintenance.mjs restore --storage-root=/var/lib/skyevault-git-remote --target-storage-root=/var/lib/skyevault-git-remote-restored --snapshot=latest --repo=acme/app
```

SSH Git can be enabled per key by wiring `deploy/skyevault-git-remote/ssh/skyevault-ssh-command.sh` as the forced command for that key, then setting `SKYEVAULT_SSH_ROLE` and `SKYEVAULT_SSH_WORKSPACES` on the key command.
