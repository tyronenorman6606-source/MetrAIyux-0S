{ config, pkgs, lib, modulesPath, self, brand, ... }:

{
  imports = [
    "${modulesPath}/installer/cd-dvd/installation-cd-minimal.nix"
    ./modules/branding.nix
    ./modules/operator-stack.nix
    ./modules/ai-stack.nix
    ./modules/orynth-router.nix
    ./modules/workstation-cde.nix
    ./modules/agent-stack.nix
    ./modules/command-center.nix
    ./modules/security.nix
  ];

  system.stateVersion = "25.11";

  networking.hostName = "sove-reign13-live";
  networking.networkmanager.enable = true;

  image.fileName = lib.mkForce "sove-reign13-node-os-${brand.version}-${pkgs.stdenv.hostPlatform.system}.iso";
  isoImage.volumeID = lib.mkForce "SOVE13NODEOS";
  isoImage.appendToMenuLabel = " - ${brand.productName}";

  boot.kernelPackages = pkgs.linuxPackages_latest;
  boot.supportedFilesystems = lib.mkForce [
    "btrfs"
    "vfat"
    "f2fs"
    "xfs"
    "ntfs"
    "cifs"
    "ext4"
  ];

  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  nix.settings.trusted-users = [ "root" "@wheel" ];

  services.openssh.enable = true;
  services.openssh.settings.PasswordAuthentication = true;
  services.openssh.settings.PermitRootLogin = "no";

  users.users.operator = {
    isNormalUser = true;
    description = "SoveReign13 operator";
    extraGroups = [ "wheel" "networkmanager" "docker" "podman" ];
    initialPassword = "sovereign13";
    shell = pkgs.bashInteractive;
  };

  security.sudo.wheelNeedsPassword = false;

  virtualisation.docker.enable = true;
  virtualisation.podman.enable = true;
  # dockerCompat provides a docker shim and conflicts with the real Docker
  # daemon, which the CDE launcher uses.
  virtualisation.podman.dockerCompat = false;

  networking.firewall.enable = true;
  networking.firewall.allowedTCPPorts = [
    22
    brand.commandCenterPort
    brand.openWebUiPort
    brand.aiRouterPort
    brand.agentApiPort
    3000
    5173
    8000
    8443
    8787
  ];

  # Ollama stays local by default in ai-stack.nix. Do not expose 11434 to the LAN
  # unless you intentionally harden and reverse-proxy it.
}
