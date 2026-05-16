{ pkgs, lib, brand, ... }:

{
  # CPU-safe default. GPU acceleration is selected after hardware detection using
  # nixos/profiles/gpu-nvidia.nix or nixos/profiles/gpu-amd-rocm.nix.
  services.ollama = {
    enable = true;
    host = "127.0.0.1";
    port = brand.ollamaPort;
    openFirewall = false;
    environmentVariables = {
      OLLAMA_KEEP_ALIVE = "1h";
      OLLAMA_NUM_PARALLEL = "1";
      OLLAMA_FLASH_ATTENTION = "1";
      OLLAMA_MODELS = "/srv/sove-reign13/models/ollama";
    };
  };

  # Operator-facing UI. Authentication remains on; create the first admin account
  # during first launch instead of shipping a hardcoded password.
  services.open-webui = {
    enable = true;
    host = "0.0.0.0";
    port = brand.openWebUiPort;
    openFirewall = true;
    environment = {
      OLLAMA_BASE_URL = "http://127.0.0.1:${toString brand.ollamaPort}";
      ENABLE_OLLAMA_API = "True";
      WEBUI_NAME = "Orynth 7.6 / SoveReign13";
      ANONYMIZED_TELEMETRY = "False";
      DO_NOT_TRACK = "True";
      SCARF_NO_ANALYTICS = "True";
    };
  };

  environment.etc."sove-reign13/orynth/ORYNTH_7_6_SYSTEM.md".source = ../../prompts/orynth/ORYNTH_7_6_SYSTEM.md;
  environment.etc."sove-reign13/ai-models.json".source = ../../env/ai-models.json;

  environment.systemPackages = [
    (pkgs.writeShellScriptBin "s13-ai-status" ''
      set +e
      echo "SoveReign13 AI services"
      echo
      systemctl is-active --quiet ollama.service && echo "✅ ollama.service active" || echo "☐ ollama.service not active"
      systemctl is-active --quiet open-webui.service && echo "✅ open-webui.service active" || echo "☐ open-webui.service not active"
      systemctl is-active --quiet orynth-router.service && echo "✅ orynth-router.service active" || echo "☐ orynth-router.service not active"
      echo
      echo "Health probes:"
      curl -fsS "http://127.0.0.1:${toString brand.ollamaPort}/api/tags" >/tmp/s13-ollama-tags.json && echo "✅ Ollama API responds" || echo "☐ Ollama API not responding"
      curl -fsS "http://127.0.0.1:${toString brand.aiRouterPort}/health" && echo || echo "☐ Orynth Router not responding"
      echo
      echo "Installed Ollama models:"
      ollama list || true
      echo
      echo "Recommended first pull: s13-install-brain lite"
    '')

    (pkgs.writeShellScriptBin "s13-install-brain" ''
      set -euo pipefail
      PROFILE="''${1:-lite}"
      echo "SoveReign13 brain installer profile: $PROFILE"
      echo "Ollama service check..."
      systemctl start ollama.service || true
      sleep 2
      curl -fsS "http://127.0.0.1:${toString brand.ollamaPort}/api/tags" >/dev/null

      pull_model() {
        model="$1"
        echo
        echo "Pulling $model"
        ollama pull "$model"
      }

      case "$PROFILE" in
        tiny)
          pull_model "qwen3:4b"
          ;;
        lite)
          pull_model "${brand.defaultLocalModel}"
          ;;
        coder)
          pull_model "${brand.defaultLocalModel}"
          pull_model "${brand.defaultCoderModel}"
          ;;
        heavy)
          pull_model "${brand.defaultLocalModel}"
          pull_model "${brand.defaultCoderModel}"
          pull_model "qwen2.5-coder:32b"
          ;;
        embeddings)
          pull_model "nomic-embed-text"
          ;;
        *)
          echo "Unknown profile: $PROFILE" >&2
          echo "Use: tiny | lite | coder | heavy | embeddings" >&2
          exit 1
          ;;
      esac

      echo
      echo "Installed models:"
      ollama list
      echo
      echo "Next proof command: s13-ai-status"
    '')

    (pkgs.writeShellScriptBin "s13-chat" ''
      set -euo pipefail
      MODEL="''${1:-${brand.defaultLocalModel}}"
      shift || true
      PROMPT="''${*:-Say SoveReign13 Node OS AI lane is online in one sentence.}"
      curl -fsS "http://127.0.0.1:${toString brand.ollamaPort}/api/chat" \
        -H 'Content-Type: application/json' \
        -d "$(jq -nc --arg model "$MODEL" --arg prompt "$PROMPT" '{model:$model, messages:[{role:"system", content:"You are Orynth 7.6 running inside SoveReign13 Node OS."},{role:"user", content:$prompt}], stream:false}')" \
        | jq -r '.message.content'
    '')

    (pkgs.writeShellScriptBin "s13-gpu-detect" ''
      set +e
      echo "SoveReign13 GPU detection"
      echo
      if command -v lspci >/dev/null 2>&1; then
        lspci | grep -Ei 'vga|3d|display|nvidia|amd|ati|intel' || true
      fi
      echo
      if command -v nvidia-smi >/dev/null 2>&1; then
        echo "NVIDIA runtime detected:"
        nvidia-smi || true
        echo "Suggested profile: nixos/profiles/gpu-nvidia.nix"
      else
        echo "No nvidia-smi detected."
      fi
      echo
      if [ -e /dev/kfd ]; then
        echo "AMD ROCm-style /dev/kfd detected. Suggested profile: nixos/profiles/gpu-amd-rocm.nix"
      else
        echo "No /dev/kfd detected."
      fi
      echo
      echo "Default ISO is CPU-safe. Add a GPU profile only after hardware confirmation."
    '')
  ];
}
