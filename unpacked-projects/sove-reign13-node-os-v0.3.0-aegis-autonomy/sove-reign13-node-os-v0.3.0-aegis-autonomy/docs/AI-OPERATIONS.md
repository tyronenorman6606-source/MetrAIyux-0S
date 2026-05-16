# AI Operations

## Honest state

SoveReign13 Node OS v0.3.0 has a real local AI runtime lane:

- Ollama service enabled.
- Open WebUI service enabled.
- Orynth 7.6 router service enabled.
- Model-pull commands included.
- Orynth identity prompt included.

It does not bundle model weights inside the repo or ISO package. Pull weights after boot because they are large and hardware-dependent.

## Service map

| Service | Port | Exposure | Purpose |
| --- | ---: | --- | --- |
| Command Center | 1313 | LAN | Internal operator guide |
| Open WebUI | 8080 | LAN | Operator model/chat UI |
| Orynth Router | 13131 | LAN | OpenAI-compatible local-first route |
| Ollama | 11434 | localhost only | Local model runtime |

## First model pull

```bash
s13-install-brain lite
```

This pulls `qwen3:8b`.

## Coding model pull

```bash
s13-install-brain coder
```

This pulls:

- `qwen3:8b`
- `deepseek-coder-v2:16b`

## Heavy pull

```bash
s13-install-brain heavy
```

This pulls:

- `qwen3:8b`
- `deepseek-coder-v2:16b`
- `qwen2.5-coder:32b`

## Router health

```bash
s13-router-health
```

## Router chat

```bash
s13-router-chat "Build me a strict deployment checklist."
```

## OpenAI-compatible route

```bash
curl -s http://127.0.0.1:13131/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"coder","messages":[{"role":"user","content":"Write a bash smoke test."}]}' \
  | jq -r '.choices[0].message.content'
```

## External fallback

The router is local-first. External fallback only runs if:

1. You set `OPENAI_API_KEY` or `ORYNTH_EXTERNAL_API_KEY`.
2. You send `"fallback": true` in the request.

Example:

```bash
export OPENAI_API_KEY='replace-me'
curl -s http://127.0.0.1:13131/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"local","fallback":true,"messages":[{"role":"user","content":"Use fallback only if local fails."}]}'
```

## GPU activation

Default ISO is CPU-safe. After hardware detection, import one profile into a permanent host config:

```nix
imports = [
  ./nixos/profiles/gpu-nvidia.nix
];
```

or:

```nix
imports = [
  ./nixos/profiles/gpu-amd-rocm.nix
];
```

Run:

```bash
s13-gpu-detect
s13-ai-status
```


## Aegis repo agent

Aegis uses the Orynth router as its model endpoint.

```bash
s13-agent --workspace ./repo scan
s13-agent --workspace ./repo plan --objective "upgrade the platform without breaking existing behavior"
s13-agent --workspace ./repo propose --task "return a unified diff for the highest-value repair"
s13-agent --workspace ./repo apply-patch .s13/runs/propose-*/proposed.patch --proof "./scripts/smoke.sh"
```

Aegis does not silently edit code. It validates patches with `git apply --check` before applying.
