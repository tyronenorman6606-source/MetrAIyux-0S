{ pkgs, lib, brand, ... }:

let
  banner = ''
    ╔══════════════════════════════════════════════════════════════════════╗
    ║  ${brand.productName} ${brand.version} — ${brand.codename}          ║
    ║  Sovereign developer node · local AI brain · deployment station     ║
    ║  Vendor: ${brand.vendor}                                            ║
    ╚══════════════════════════════════════════════════════════════════════╝
  '';
in {
  system.nixos.distroId = brand.distroId;
  system.nixos.distroName = brand.productName;
  system.nixos.variant_id = "node-os-ai";
  system.nixos.variantName = "SoveReign13 Node OS AI Live Image";
  system.nixos.vendorId = "skyes-over-london";
  system.nixos.vendorName = brand.vendor;
  system.image.id = "sove-reign13-node-os";
  system.image.version = brand.version;
  system.nixos.extraOSReleaseArgs = {
    HOME_URL = "https://skyesoverlondon.com";
    SUPPORT_URL = "https://skyesoverlondon.com";
    DOCUMENTATION_URL = "https://skyesoverlondon.com";
    ANSI_COLOR = "1;38;2;94;234;212";
  };

  environment.etc."issue".text = ''
    ${banner}

    Login user: operator
    Live password: sovereign13
    Command Center: http://<machine-ip>:${toString brand.commandCenterPort}
    Open WebUI:     http://<machine-ip>:${toString brand.openWebUiPort}
    Orynth Router:  http://<machine-ip>:${toString brand.aiRouterPort}/health

    This is a branded NixOS downstream profile. Preserve upstream license notices.
  '';

  environment.etc."motd".text = ''
    ${banner}

    First proof commands:
      s13-status
      s13-ai-status
      s13-gpu-detect
      s13-command-center
      s13-install-brain lite

    Local services:
      Deployment Command Center: http://127.0.0.1:${toString brand.commandCenterPort}
      Open WebUI:                  http://127.0.0.1:${toString brand.openWebUiPort}
      Orynth Router health:         http://127.0.0.1:${toString brand.aiRouterPort}/health
      Ollama API:                   http://127.0.0.1:${toString brand.ollamaPort}

    Security note: change the live password before using this on any hostile network.
  '';

  environment.variables = {
    SOVE_REIGN13_PRODUCT = brand.productName;
    SOVE_REIGN13_VERSION = brand.version;
    SOVE_REIGN13_VENDOR = brand.vendor;
    SOVE_REIGN13_COMMAND_CENTER_PORT = toString brand.commandCenterPort;
    SOVE_REIGN13_AI_ROUTER_PORT = toString brand.aiRouterPort;
    SOVE_REIGN13_OPEN_WEBUI_PORT = toString brand.openWebUiPort;
    ORYNTH_LOCAL_MODEL = brand.defaultLocalModel;
    ORYNTH_CODER_MODEL = brand.defaultCoderModel;
  };

  environment.shellAliases = {
    ll = "ls -alh";
    gs = "git status --short";
    s13 = "s13-status";
    ai = "s13-ai-status";
    brain = "s13-install-brain";
    command-center = "s13-command-center";
  };

  programs.bash.promptInit = ''
    if [ "$UID" -eq 0 ]; then
      PS1='[SoveReign13 root \w]# '
    else
      PS1='[SoveReign13 \u@\h \w]$ '
    fi
  '';

  environment.systemPackages = [
    (pkgs.writeShellScriptBin "s13-status" ''
      set -e
      echo "${brand.productName} ${brand.version} — ${brand.codename}"
      echo "Host: $(hostname)"
      echo "Kernel: $(uname -srmo)"
      echo "NixOS: $(nixos-version || true)"
      echo "Uptime: $(uptime -p || true)"
      echo "IP addresses:"
      ip -br addr || true
      echo
      echo "Command Center: http://127.0.0.1:${toString brand.commandCenterPort}"
      echo "Open WebUI:     http://127.0.0.1:${toString brand.openWebUiPort}"
      echo "Orynth Router:  http://127.0.0.1:${toString brand.aiRouterPort}/health"
    '')

    (pkgs.writeShellScriptBin "s13-command-center" ''
      set -e
      echo "SoveReign13 Deployment Command Center:"
      echo "  http://127.0.0.1:${toString brand.commandCenterPort}"
      echo
      systemctl --no-pager status sove-reign13-command-center.service || true
    '')

    (pkgs.writeShellScriptBin "s13-recovery" ''
      set -e
      cat <<'RECOVERY'
SoveReign13 artifact recovery checklist

1. Mount recovered disks read-only when possible.
2. Search for Git data:
   find /mnt -name .git -type d 2>/dev/null
3. Search for source bundles:
   find /mnt -iname '*.zip' -o -iname '*.tar.gz' -o -iname '*.tgz' 2>/dev/null
4. Mirror intact repos:
   git clone --mirror /path/to/repo repo.git
5. Export working tree:
   rsync -a --info=progress2 /source/project/ /safe/recovery/project/
6. Hash final artifacts:
   sha256sum artifact.zip > artifact.zip.sha256
RECOVERY
    '')
  ];
}
