# SoveReign13 Node OS v0.3.0 — Aegis Autonomy

A branded NixOS-based AI developer/operator OS by Skyes Over London / SOLEnterprises.

This is not a fake new kernel. It is a downstream, deployable NixOS ISO foundation with a branded operator layer, local-first AI runtime, Orynth 7.6 router, Open WebUI, code-server launcher, Aegis repo agent, and Reliquary backup tooling.

## What is now real

- Bootable custom NixOS ISO configuration path.
- Branded shell/login/command center assets.
- Ollama local runtime enabled by default.
- Open WebUI service wired to Ollama.
- Orynth 7.6 OpenAI-compatible local-first router.
- Model installer profiles: `tiny`, `lite`, `coder`, `heavy`, `embeddings`.
- Aegis Agent CLI: repo scan, plan, AI proposal, patch validation, queued tasks.
- Reliquary CLI: repo backup archives with manifests and SHA256 verification.
- CDE launcher using code-server.
- GPU detection and optional NVIDIA/ROCm profile files.
- Local smoke tests for file presence, shell syntax, Python syntax, and router health in dev mode.

## What is still not proven inside this zip

- Actual `nix build .#iso` output, because this packaging environment did not have Nix installed.
- VM boot proof.
- USB boot proof.
- Real GPU acceleration proof.
- Real model answer quality proof after pulling weights.
- Autonomous patch success on your private repos.

Those are hardware/environment gates, not claims hidden by the package.

## Build

```bash
./scripts/check-prereqs.sh
./scripts/smoke.sh
./scripts/build-iso.sh
```

## First boot commands

```bash
s13-status
s13-ai-status
s13-install-brain coder
s13-router-chat "Confirm Orynth 7.6 is online."
```

## Repo agent commands

```bash
cd /srv/sove-reign13/workspaces/my-repo
s13-agent init
s13-agent scan
s13-agent plan --objective "close the broken client-facing routes"
s13-agent propose --task "return a unified diff that fixes broken buttons and routes"
s13-agent apply-patch .s13/runs/propose-*/proposed.patch --proof "./scripts/smoke.sh"
```

Shortcut wrappers are also installed:

```bash
s13-agent-scan .
s13-agent-plan . "upgrade the app without breaking existing behavior"
s13-agent-propose . "fix the highest-risk issues from the scan"
s13-backup .
s13-doctor
```

## Operator rule

Aegis can propose patches. It only applies a patch after `git apply --check` passes and you call the apply command. This is deliberate: autonomous editing without validation is how repos get damaged.
