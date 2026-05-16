#!/usr/bin/env bash
set -euo pipefail

# Push local cloned repositories into Forgejo.
# This is for recovery when you have local working copies, old zips, or checked-out repos.
#
# Required env:
#   LOCAL_REPO_ROOT=/path/containing/repos
#   FORGEJO_URL=https://forge.example.com
#   FORGEJO_TOKEN=your_forgejo_pat
#   FORGEJO_OWNER=your_user_or_org
#
# Optional:
#   PRIVATE=true

LOCAL_REPO_ROOT="${LOCAL_REPO_ROOT:-}"
FORGEJO_URL="${FORGEJO_URL:-}"
FORGEJO_TOKEN="${FORGEJO_TOKEN:-}"
FORGEJO_OWNER="${FORGEJO_OWNER:-}"
PRIVATE="${PRIVATE:-true}"

if [ -z "$LOCAL_REPO_ROOT" ] || [ -z "$FORGEJO_URL" ] || [ -z "$FORGEJO_TOKEN" ] || [ -z "$FORGEJO_OWNER" ]; then
  echo "Missing required env."
  echo "Example:"
  echo 'LOCAL_REPO_ROOT="$HOME/projects" FORGEJO_URL="https://forge.example.com" FORGEJO_TOKEN="token" FORGEJO_OWNER="gray" ./scripts/bulk-push-local-repos.sh'
  exit 1
fi

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd git
need_cmd curl
need_cmd jq

create_repo() {
  local repo="$1"
  local payload
  payload="$(jq -n --arg name "$repo" --argjson private "$PRIVATE" '{name:$name, private:$private, auto_init:false}')"

  # Try org repo first. If owner is a user, fall back to user repo endpoint.
  if ! curl -fsS -X POST \
      -H "Authorization: token ${FORGEJO_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "${FORGEJO_URL}/api/v1/orgs/${FORGEJO_OWNER}/repos" >/dev/null; then
    curl -fsS -X POST \
      -H "Authorization: token ${FORGEJO_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "${FORGEJO_URL}/api/v1/user/repos" >/dev/null || true
  fi
}

push_repo() {
  local path="$1"
  local repo
  repo="$(basename "$path" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9._-')"

  if [ -z "$repo" ]; then
    echo "Skipping invalid repo path: $path"
    return
  fi

  echo "→ Creating/upserting repo: $repo"
  create_repo "$repo"

  local tmp
  tmp="$(mktemp -d)"
  git clone --mirror "$path" "$tmp/$repo.git" >/dev/null
  (
    cd "$tmp/$repo.git"
    git remote set-url origin "${FORGEJO_URL}/${FORGEJO_OWNER}/${repo}.git"
    git push --mirror "https://oauth2:${FORGEJO_TOKEN}@${FORGEJO_URL#https://}/${FORGEJO_OWNER}/${repo}.git"
  )
  rm -rf "$tmp"
  echo "  pushed: $repo"
}

while IFS= read -r gitdir; do
  repo_path="$(dirname "$gitdir")"
  push_repo "$repo_path"
done < <(find "$LOCAL_REPO_ROOT" -type d -name ".git" -prune)

echo "Bulk push complete."
