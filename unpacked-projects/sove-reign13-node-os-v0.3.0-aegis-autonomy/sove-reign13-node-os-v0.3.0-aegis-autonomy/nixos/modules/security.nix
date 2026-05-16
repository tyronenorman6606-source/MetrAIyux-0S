{ ... }:

{
  security.rtkit.enable = true;
  services.fail2ban.enable = false;

  # Live ISO default: operator convenience. For permanent installs, lock this down.
  services.openssh.openFirewall = true;
}
