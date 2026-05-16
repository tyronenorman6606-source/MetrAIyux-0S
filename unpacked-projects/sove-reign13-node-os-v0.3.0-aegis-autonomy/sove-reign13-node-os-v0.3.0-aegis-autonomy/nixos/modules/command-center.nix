{ pkgs, brand, ... }:

{
  environment.etc."sove-reign13/command-center/index.html".source = ../../command-center/index.html;
  environment.etc."sove-reign13/command-center/styles.css".source = ../../command-center/styles.css;
  environment.etc."sove-reign13/command-center/app.js".source = ../../command-center/app.js;

  systemd.services.sove-reign13-command-center = {
    description = "${brand.productName} Deployment Command Center";
    wantedBy = [ "multi-user.target" ];
    after = [ "network-online.target" ];
    wants = [ "network-online.target" ];

    serviceConfig = {
      Type = "simple";
      WorkingDirectory = "/etc/sove-reign13/command-center";
      ExecStart = "${pkgs.python3}/bin/python3 -m http.server ${toString brand.commandCenterPort} --bind 0.0.0.0";
      Restart = "on-failure";
      RestartSec = 2;
      DynamicUser = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      PrivateTmp = true;
      NoNewPrivileges = true;
    };
  };
}
