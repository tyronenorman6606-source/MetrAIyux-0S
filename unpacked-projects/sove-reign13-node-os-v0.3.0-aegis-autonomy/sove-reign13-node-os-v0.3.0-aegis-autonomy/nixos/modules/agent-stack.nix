{ pkgs, brand, ... }:

{
  environment.etc."sove-reign13/aegis-agent/agent.py".source = ../../tools/s13-agent/agent.py;
  environment.etc."sove-reign13/reliquary/reliquary.py".source = ../../tools/s13-reliquary/reliquary.py;
  environment.etc."sove-reign13/system/doctor.py".source = ../../tools/s13-system/doctor.py;

  systemd.tmpfiles.rules = [
    "d /srv/sove-reign13/agent-runs 0755 operator users -"
    "d /srv/sove-reign13/queue 0755 operator users -"
    "d /srv/sove-reign13/reliquary 0755 operator users -"
  ];

  environment.systemPackages = [
    (pkgs.writeShellScriptBin "s13-agent" ''
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py "$@"
    '')

    (pkgs.writeShellScriptBin "s13-agent-init" ''
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "''${1:-.}" init
    '')

    (pkgs.writeShellScriptBin "s13-agent-scan" ''
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "''${1:-.}" scan
    '')

    (pkgs.writeShellScriptBin "s13-agent-plan" ''
      WORKSPACE="''${1:-.}"
      shift || true
      OBJECTIVE="''${*:-Improve this repo without breaking existing behavior.}"
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" plan --objective "$OBJECTIVE"
    '')

    (pkgs.writeShellScriptBin "s13-agent-propose" ''
      if [ "$#" -lt 2 ]; then
        echo "Usage: s13-agent-propose <workspace> <task>" >&2
        exit 1
      fi
      WORKSPACE="$1"
      shift
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" propose --task "$*"
    '')

    (pkgs.writeShellScriptBin "s13-agent-apply" ''
      if [ "$#" -lt 2 ]; then
        echo "Usage: s13-agent-apply <workspace> <patch> [proof command...]" >&2
        exit 1
      fi
      WORKSPACE="$1"
      PATCH="$2"
      shift 2
      if [ "$#" -gt 0 ]; then
        exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" apply-patch "$PATCH" --proof "$*"
      else
        exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" apply-patch "$PATCH"
      fi
    '')

    (pkgs.writeShellScriptBin "s13-agent-queue-add" ''
      WORKSPACE="''${1:-.}"
      shift || true
      TASK="''${*:-}"
      if [ -z "$TASK" ]; then
        echo "Usage: s13-agent-queue-add <workspace> <task>" >&2
        exit 1
      fi
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" queue-add "$TASK"
    '')

    (pkgs.writeShellScriptBin "s13-agent-queue-run" ''
      WORKSPACE="''${1:-.}"
      LIMIT="''${2:-1}"
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/aegis-agent/agent.py --workspace "$WORKSPACE" queue-run --limit "$LIMIT"
    '')

    (pkgs.writeShellScriptBin "s13-reliquary" ''
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/reliquary/reliquary.py "$@"
    '')

    (pkgs.writeShellScriptBin "s13-backup" ''
      WORKSPACE="''${1:-.}"
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/reliquary/reliquary.py backup --workspace "$WORKSPACE"
    '')

    (pkgs.writeShellScriptBin "s13-doctor" ''
      exec ${pkgs.python3}/bin/python3 /etc/sove-reign13/system/doctor.py
    '')
  ];
}
