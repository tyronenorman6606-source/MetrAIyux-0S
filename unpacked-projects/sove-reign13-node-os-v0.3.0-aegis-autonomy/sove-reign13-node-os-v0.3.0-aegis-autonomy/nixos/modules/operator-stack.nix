{ pkgs, lib, ... }:

{
  environment.systemPackages = with pkgs; [
    # Core shell and diagnostics
    bashInteractive
    coreutils
    gnused
    gawk
    findutils
    file
    which
    tree
    htop
    btop
    lsof
    pciutils
    usbutils
    lshw
    inetutils
    dnsutils
    iproute2
    iputils
    nmap
    ncdu

    # Transport and archives
    curl
    wget
    rsync
    rclone
    restic
    zip
    unzip
    zstd
    gzip
    xz
    gnutar

    # Editors and terminal workflow
    nano
    vim
    neovim
    tmux
    screen
    git
    git-lfs
    gh
    gnupg
    jq
    ripgrep
    fd
    bat
    eza

    # Languages and build tools
    nodejs
    python3
    python3Packages.pip
    go
    rustc
    cargo
    gcc
    gnumake
    cmake
    pkg-config

    # Data and platform tooling
    sqlite
    postgresql
    redis
    openssl
    age
    sops

    # Container/operator tools
    docker
    docker-compose
    podman
    podman-compose
    skopeo
    buildah

    # Nix operator tools
    nix-output-monitor
    nh

    # Local AI foundation
    ollama
  ];

  programs.git.enable = true;
  programs.nh.enable = true;

  systemd.tmpfiles.rules = [
    "d /srv/sove-reign13 0755 operator users -"
    "d /srv/sove-reign13/workspaces 0755 operator users -"
    "d /srv/sove-reign13/models 0755 operator users -"
    "d /srv/sove-reign13/reliquary 0755 operator users -"
    "d /srv/sove-reign13/logs 0755 operator users -"
    "d /srv/sove-reign13/secrets 0700 operator users -"
  ];
}
