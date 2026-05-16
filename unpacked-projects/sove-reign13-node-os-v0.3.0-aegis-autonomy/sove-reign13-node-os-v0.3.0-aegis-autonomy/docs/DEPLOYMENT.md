# SoveReign13 Node OS Deployment Guide

## 1. Build host requirements

You need a Linux machine with Nix installed and enough disk space for the Nix store and ISO build output. Expect multiple gigabytes of downloads/build cache.

Run:

```bash
./scripts/check-prereqs.sh
./scripts/smoke.sh
./scripts/build-iso.sh
```

## 2. Bootable USB

Find the USB disk:

```bash
lsblk
```

Write the ISO:

```bash
sudo ./scripts/write-usb.sh /dev/sdX
```

## 3. Live boot proof

After boot:

```bash
s13-status
cat /etc/issue
cat /etc/motd
systemctl status sove-reign13-command-center --no-pager
systemctl status ollama open-webui orynth-router --no-pager
s13-ai-status
```

Open:

```text
http://127.0.0.1:1313
http://127.0.0.1:8080
http://127.0.0.1:13131/health
```

From another device on the LAN:

```text
http://<machine-ip>:1313
http://<machine-ip>:8080
http://<machine-ip>:13131/health
```

## 4. Model activation

Pull the small/default brain:

```bash
s13-install-brain lite
```

Pull coding lane:

```bash
s13-install-brain coder
```

Test:

```bash
s13-router-chat "Confirm the local AI lane is online."
```

## 5. CDE activation

```bash
export S13_CDE_PASSWORD='replace-this-now'
s13-start-cde /srv/sove-reign13/workspaces
```

Open:

```text
http://127.0.0.1:8443
```

## 6. Permanent install outline

Partition and mount your disk using the normal NixOS install flow. Then generate hardware config:

```bash
sudo nixos-generate-config --root /mnt
```

Copy this repo to `/mnt/etc/nixos/sove-reign13-node-os` or clone it into your target system after networking is available.

Merge generated `hardware-configuration.nix` into a host-specific NixOS config. Do not use the live ISO password for permanent systems.

## 7. GPU profile selection

Default ISO is CPU-safe. For a permanent NVIDIA host, import:

```nix
./nixos/profiles/gpu-nvidia.nix
```

For compatible AMD ROCm hardware, import:

```nix
./nixos/profiles/gpu-amd-rocm.nix
```

Validate:

```bash
s13-gpu-detect
s13-ai-status
```

## 8. Required hardening before production exposure

- Change or remove the default `operator` password.
- Disable password SSH login if not needed.
- Use SSH keys.
- Restrict firewall ports.
- Keep Ollama bound locally unless protected behind a trusted proxy.
- Keep Open WebUI authentication on.
- Store provider credentials outside public repos.
- Configure full-disk encryption if this is a mobile workstation.
- Set up backups through Reliquary/restic/rclone before client data touches the machine.

## 9. Provider environment slots

Create local-only secret files:

```bash
mkdir -p ~/.config/sove-reign13/secrets
chmod 700 ~/.config/sove-reign13/secrets
cp env/example.env ~/.config/sove-reign13/secrets/sove-reign13.env
chmod 600 ~/.config/sove-reign13/secrets/sove-reign13.env
```

Never commit real secrets.
