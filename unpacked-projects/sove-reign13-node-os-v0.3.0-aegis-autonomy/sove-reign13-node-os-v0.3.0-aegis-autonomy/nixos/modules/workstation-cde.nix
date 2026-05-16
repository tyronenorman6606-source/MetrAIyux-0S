{ pkgs, brand, ... }:

{
  environment.systemPackages = [
    (pkgs.writeShellScriptBin "s13-start-cde" ''
      set -euo pipefail
      WORKSPACE="''${1:-/srv/sove-reign13/workspaces}"
      PORT="''${S13_CDE_PORT:-8443}"
      PASSWORD="''${S13_CDE_PASSWORD:-change-me-now}"
      mkdir -p "$WORKSPACE"
      echo "Starting code-server container on port $PORT with workspace $WORKSPACE"
      echo "Password source: S13_CDE_PASSWORD env var. Current fallback is insecure; change it."
      docker rm -f sove-reign13-cde >/dev/null 2>&1 || true
      docker run -d \
        --name sove-reign13-cde \
        --restart unless-stopped \
        -p "$PORT:8080" \
        -e PASSWORD="$PASSWORD" \
        -v "$WORKSPACE:/home/coder/project" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        ghcr.io/coder/code-server:latest
      echo "CDE URL: http://127.0.0.1:$PORT"
    '')

    (pkgs.writeShellScriptBin "s13-stop-cde" ''
      set -euo pipefail
      docker rm -f sove-reign13-cde
    '')
  ];
}
