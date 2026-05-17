#!/usr/bin/env sh
set -eu
: "${SKYEVAULT_GIT_REMOTE_ROOT:=/var/lib/skyevault-git-remote}"
: "${SKYEVAULT_SSH_ROLE:=viewer}"
: "${SKYEVAULT_SSH_WORKSPACES:=}"
export SKYEVAULT_GIT_REMOTE_ROOT SKYEVAULT_SSH_ROLE SKYEVAULT_SSH_WORKSPACES
exec /usr/bin/node /opt/metraiyux-0s/tools/skyevault-ssh-git-shell.mjs
