# Obsidian + 0S Operator Sync

This repo has a local Obsidian command center and an allowlisted 0S command runner.

## Public-Safe

- Public/local browser brain content may say curated vault notes can be synced into the local brain.
- Public pages may describe the workflow at a high level: vault notes, proof-safe export, local-brain retrieval, and human approval gates.
- Public pages must not expose secrets, customer data, private operator notes, raw production account commands, or the command allowlist.

## Repo-Local Only

- The command allowlist lives at `ops/0s-command-registry.json`.
- The runner lives at `tools/0s-command-runner.mjs`.
- Detailed command IDs are for local operator use through CLI help and this repo documentation.

## Operator Commands

List allowlisted command IDs:

```bash
npm run 0s:command -- help
```

Sync curated Obsidian notes into the local brain:

```bash
npm run 0s:command -- obsidian:sync
```

Inspect the current vault export:

```bash
npm run 0s:command -- obsidian:inspect
```

Generate the private neural map:

```bash
npm run 0s:command -- obsidian:graph
```

Generate the web-safe neural map data:

```bash
npm run 0s:command -- obsidian:web-graph
```

Validate brain scripts and JSON:

```bash
npm run 0s:command -- brain:validate
```

Refresh SkyeRunners, Obsidian export, private graph, public-safe graph, and SkyeVault map in one run:

```bash
npm run 0s:command -- skyerunners:knowledge-refresh
```

Build only the SkyeRunners repo knowledge map:

```bash
npm run 0s:command -- skyerunners:map
```

Start the local SkyeRunners admin bridge:

```bash
npm run 0s:command -- skyerunners:control
```

Run the SkyeRunners static human-flow QA lane:

```bash
npm run 0s:command -- skyerunners:crawler-static
```

## Exposure Boundary

Do not move `ops/0s-command-registry.json` into `metraiyux_0s_site/` unless the deployment has an auth gate. Anything under `metraiyux_0s_site/` should be treated as static-public unless the host protects it.

The visual map lives at `obsidian-vault/_neural-map/index.html`. It is private operator material and should stay out of public sitemap/deployment paths unless protected by real auth.

The public web map lives at `metraiyux_0s_site/neural-map.html`. Its data is generated only from curated `brain: true` Obsidian export data and strips internal source paths before publishing.

SkyeRunners writes a repo-aware local brain feed at `metraiyux_0s_site/brain/skyerunners.json`. That file is safe for the admin/operator brain map, but the runtime queue and ledger under `ops/skyerunners/` stay repo-local and should not be treated as public static content.
