{ pkgs, brand, ... }:

{
  environment.etc."sove-reign13/orynth-router/router.py".source = ../../tools/orynth-router/router.py;
  environment.etc."sove-reign13/orynth-router.env".text = ''
    ORYNTH_ROUTER_HOST=0.0.0.0
    ORYNTH_ROUTER_PORT=${toString brand.aiRouterPort}
    ORYNTH_LOCAL_BASE_URL=http://127.0.0.1:${toString brand.ollamaPort}
    ORYNTH_LOCAL_MODEL=${brand.defaultLocalModel}
    ORYNTH_CODER_MODEL=${brand.defaultCoderModel}
    ORYNTH_SYSTEM_PROMPT_PATH=/etc/sove-reign13/orynth/ORYNTH_7_6_SYSTEM.md
    ORYNTH_EXTERNAL_BASE_URL=https://api.openai.com/v1
    ORYNTH_EXTERNAL_MODEL='gpt-4.1-mini'
  '';

  systemd.services.orynth-router = {
    description = "Orynth 7.6 local-first AI router for SoveReign13";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" "ollama.service" ];
    wants = [ "network-online.target" "ollama.service" ];

    serviceConfig = {
      Type = "simple";
      ExecStart = "${pkgs.python3}/bin/python3 /etc/sove-reign13/orynth-router/router.py";
      EnvironmentFile = "-/etc/sove-reign13/orynth-router.env";
      Restart = "on-failure";
      RestartSec = 3;
      User = "operator";
      Group = "users";
      WorkingDirectory = "/srv/sove-reign13";
      NoNewPrivileges = true;
      PrivateTmp = true;
      ProtectSystem = "strict";
      ReadWritePaths = [ "/srv/sove-reign13" ];
    };
  };

  networking.firewall.allowedTCPPorts = [ brand.aiRouterPort ];

  environment.systemPackages = [
    (pkgs.writeShellScriptBin "s13-router-health" ''
      set -euo pipefail
      curl -fsS "http://127.0.0.1:${toString brand.aiRouterPort}/health" | jq .
    '')

    (pkgs.writeShellScriptBin "s13-router-chat" ''
      set -euo pipefail
      PROMPT="''${*:-Give me a one sentence SoveReign13 status check.}"
      curl -fsS "http://127.0.0.1:${toString brand.aiRouterPort}/v1/chat/completions" \
        -H 'Content-Type: application/json' \
        -d "$(jq -nc --arg prompt "$PROMPT" '{model:"local", messages:[{role:"user", content:$prompt}], stream:false}')" \
        | jq -r '.choices[0].message.content'
    '')
  ];
}
