# Optional host profile: import this only on a permanent install or GPU image
# after confirming the target machine has a supported NVIDIA GPU.
{ pkgs, ... }:

{
  nixpkgs.config.allowUnfree = true;
  hardware.graphics.enable = true;
  services.xserver.videoDrivers = [ "nvidia" ];
  hardware.nvidia = {
    modesetting.enable = true;
    open = false;
    nvidiaSettings = true;
  };

  services.ollama = {
    package = pkgs.ollama-cuda;
    acceleration = "cuda";
  };

  environment.systemPackages = with pkgs; [
    pciutils
    nvtopPackages.nvidia
  ];
}
