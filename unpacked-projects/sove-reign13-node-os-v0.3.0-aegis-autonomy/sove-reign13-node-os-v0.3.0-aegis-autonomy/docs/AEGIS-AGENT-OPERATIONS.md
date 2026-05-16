# Aegis Agent Operations

Aegis is the repo-working layer for SoveReign13 Node OS.

It is designed for local-first autonomous coding workflows without pretending that unproven edits happened.

## Core workflow

```bash
s13-backup /srv/sove-reign13/workspaces/app
s13-agent --workspace /srv/sove-reign13/workspaces/app init
s13-agent --workspace /srv/sove-reign13/workspaces/app scan
s13-agent --workspace /srv/sove-reign13/workspaces/app plan --objective "repair the client-facing website"
s13-agent --workspace /srv/sove-reign13/workspaces/app propose --task "fix broken navigation and return a unified diff"
s13-agent --workspace /srv/sove-reign13/workspaces/app apply-patch .s13/runs/propose-*/proposed.patch --proof "./scripts/smoke.sh"
```

## Queue workflow

```bash
s13-agent --workspace ./app queue-add "scan and repair 404 presentation routes"
s13-agent --workspace ./app queue-add "add deployment command center page"
s13-agent --workspace ./app queue-run --limit 2
```

Queued tasks create proposal run directories. Applying patches is still explicit.

## Run ledger

Every run writes to `.s13/runs/<run-id>`:

- `scan.json`
- `PROMPT.md`
- `RESPONSE.md`
- `proposed.patch` when a diff is found
- `git-apply-check.stdout`
- `git-apply-check.stderr`

## Honest limit

Aegis can only modify code from context it can read and from patches the model returns. If the model returns prose only, Aegis saves the response and does not invent a fake diff.
