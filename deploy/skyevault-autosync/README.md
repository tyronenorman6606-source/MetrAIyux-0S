# SkyeVault Autosync Deploy

This deploys the repo parity heartbeat for a persistent developer host.

For a quick local developer setup, the repo includes a managed agent wrapper:

```bash
npm run vault:agent:status
npm run vault:autosync:dry-run -- --env-file=env.txt --mode=full
npm run vault:autosync:notify:on
npm run vault:agent:start -- --env-file=env.txt --mode=full --interval-seconds=600
npm run vault:agent:status
```

Use systemd when you want the host OS to restart the agent after reboot.

The timer runs every ten minutes:

```bash
sudo install -m 0644 deploy/skyevault-autosync/systemd/skyevault-autosync.service /etc/systemd/system/skyevault-autosync.service
sudo install -m 0644 deploy/skyevault-autosync/systemd/skyevault-autosync.timer /etc/systemd/system/skyevault-autosync.timer
sudo install -m 0600 /dev/stdin /etc/skyevault/autosync.env <<'ENV'
SKYEVAULT_AUTOSYNC_MODE=git+full
SKYEVAULT_AUTOSYNC_FULL_ARCHIVE_FORMAT=tar.zst
SKYEVAULT_AUTOSYNC_FULL_MAX_GB=50
SKYEVAULT_AUTOSYNC_FULL_DIRECT_R2=1
SKYEVAULT_FULL_REPO_SOURCE_CUSTODY=1
SKYEVAULT_DROP_URL=https://skyevault-drop.graylondonskyes.workers.dev
SKYEVAULT_PORTAL_KEY=from-secret-manager
SKYEVAULT_WORKSPACE_ID=owner-admin
SKYEVAULT_AUTOSYNC_NOTIFY=0
RESEND_API_KEY=from-secret-manager
RESEND_FROM_EMAIL="SkyeVault <vault@your-domain.example>"
SKYEVAULT_AUTOSYNC_NOTIFY_TO=owner@example.com
SKYEVAULT_AUTOSYNC_LOGO_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/assets/metraiyux-0s-emblem-transparent.png
SKYEVAULT_AUTOSYNC_PROOF_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/skyevault-autosync-proof.html
SKYEVAULT_AUTOSYNC_UNLOCK_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-secure-secret-packs/app.html
SKYEVAULT_AUTOSYNC_COMMAND_CENTER_URL=https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/skyevault-command-center.html
SKYEVAULT_AUTOSYNC_VAULT_DRIVE_URL=https://skyevault-drop.graylondonskyes.workers.dev/#client-vault
ENV
sudo systemctl daemon-reload
sudo systemctl enable --now skyevault-autosync.timer
```

Keep `/etc/skyevault/autosync.env` out of Git. The default `git+full` mode uploads the clone-capable Git vault pack and an encrypted streaming source-custody artifact only when the autosync digest changes. Source custody keeps `.git`, tracked source, untracked source, local env/config, and secrets inside the encrypted artifact while excluding dependency/cache/build output and production media.

Enable or disable Resend update emails without editing the timer:

```bash
npm run vault:autosync:notify:on -- --to=owner@example.com --throttle-minutes=10
npm run vault:autosync:notify:status
npm run vault:autosync:notify:off
```

The local daemon reads `.skyevault-out/autosync-notify-settings.json` and sends a deduped email after a successful changed sync when notifications are enabled. Public proof is generated with:

```bash
npm run vault:autosync:proof
npm run 0s:build:proof
```

The generated proof page and rolling log live under `metraiyux_0s_site/proof/` and publish only public-safe receipts, digests, counts, and daemon state.

Email receipts include the logo, proof page, vault drive, unlock surface, command center, artifact receipt, and control-pack receipt. Signed download URLs are included when the selected upload mode mints them; direct R2 mode relies on the owner-gated vault recovery lane instead of a public signed artifact URL.
