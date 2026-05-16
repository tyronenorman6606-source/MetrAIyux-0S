# Optional host profile: import this only after confirming ROCm compatibility.
{ pkgs, ... }:

{
  hardware.graphics.enable = true;
  services.ollama = {
    acceleration = "rocm";
  };

  environment.systemPackages = with pkgs; [
    pciutils
    nvtopPackages.amd
  ];
}
