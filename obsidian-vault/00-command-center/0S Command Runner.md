---
title: 0S Command Runner
brain: false
tags:
  - metraiyux
  - commands
  - operator
  - obsidian
---

# 0S Command Runner

The 0S command runner is the local, allowlisted command interface for operator workflows. The browser brain can explain command IDs, but shell execution stays inside the local repo environment.

## Main Commands

- `npm run 0s:command -- obsidian:sync` syncs curated Obsidian notes into the local brain.
- `npm run 0s:command -- obsidian:inspect` checks the current Obsidian brain export counts.
- `npm run 0s:command -- obsidian:graph` generates the private neural map data.
- `npm run 0s:command -- brain:validate` validates the brain loader, sync script, command registry, and exported JSON.
- `npm run 0s:command -- site:serve` serves the MetrAIyux 0S site locally.
- `npm run 0s:command -- qa:crawl-static` runs static SkyeCrawler QA.
- `npm run 0s:command -- repo:health` runs the repo health check.

## Source Of Truth

The command source of truth is `ops/0s-command-registry.json`.

## Safety Boundary

Commands should stay allowlisted, local, and proof-producing. Do not add destructive commands, secret-printing commands, production publishing, or account-changing commands without a separate approval gate.
