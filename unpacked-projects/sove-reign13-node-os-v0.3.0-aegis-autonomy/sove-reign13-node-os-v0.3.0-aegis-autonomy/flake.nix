{
  description = "SoveReign13 Node OS - branded NixOS AI developer node, live ISO, and workstation foundation";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
    let
      brand = {
        productName = "SoveReign13 Node OS";
        distroId = "sovereign13";
        version = "0.3.0";
        codename = "Aegis Autonomy";
        vendor = "Skyes Over London / SOLEnterprises";
        commandCenterPort = 1313;
        aiRouterPort = 13131;
        agentApiPort = 13132;
        openWebUiPort = 8080;
        ollamaPort = 11434;
        defaultLocalModel = "qwen3:8b";
        defaultCoderModel = "deepseek-coder-v2:16b";
      };
    in {
      nixosConfigurations = {
        sovereign13-iso-x86_64 = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          specialArgs = { inherit self brand; };
          modules = [
            ({ lib, ... }: {
              nixpkgs.config.allowUnfreePredicate = pkg:
                builtins.elem (lib.getName pkg) [ "open-webui" ];
            })
            ./nixos/iso.nix
          ];
        };
      };

      packages.x86_64-linux.iso = self.nixosConfigurations.sovereign13-iso-x86_64.config.system.build.isoImage;
      packages.x86_64-linux.default = self.packages.x86_64-linux.iso;

      devShells.x86_64-linux.default =
        let pkgs = import nixpkgs { system = "x86_64-linux"; };
        in pkgs.mkShell {
          packages = with pkgs; [
            nixfmt-rfc-style
            statix
            deadnix
            shellcheck
            git
            jq
            curl
            python3
          ];

          shellHook = ''
            echo "SoveReign13 Node OS v0.3.0 Aegis Autonomy dev shell loaded."
            echo "Run: ./scripts/smoke.sh && ./scripts/build-iso.sh"
          '';
        };
    };
}
