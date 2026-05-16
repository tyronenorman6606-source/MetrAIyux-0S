# Proof Ledger — SoveReign13 Node OS v0.3.0

## Proven in packaging environment

✅ Full file package generated.
✅ Required file presence smoke passed.
✅ Bash syntax smoke passed.
✅ Python syntax smoke passed for Orynth router, Aegis Agent, Reliquary, and system doctor.
✅ Creator identity scan passed.
✅ Orynth router health endpoint responded in local dev mode.
✅ Aegis Agent scan/plan commands ran against this repo package.
✅ Reliquary backup command created an archive and manifest for this package.

## Not proven in packaging environment

☐ `nix build .#iso` was not run because Nix is not installed in this sandbox.
☐ ISO VM boot was not run.
☐ USB boot was not run.
☐ NVIDIA/ROCm GPU acceleration was not proven.
☐ Ollama model pull was not run in this sandbox.
☐ Open WebUI runtime was not proven in this sandbox.
☐ Aegis autonomous patch application against a private production repo was not proven.

## Required operator proof after deployment

```bash
./scripts/check-prereqs.sh
./scripts/smoke.sh
./scripts/build-iso.sh
s13-ai-status
s13-install-brain coder
s13-router-chat "Confirm Orynth is live."
s13-doctor
```
