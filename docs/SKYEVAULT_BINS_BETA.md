# SkyeVault Bins Beta

SkyeVault Bins are scoped custody folders for work that should be protected without forcing every file into a public Git workflow first.

Examples:

- `devooderator-blog` for the DevodeRator source, blog posts, copied social assets, and business-card mirrors.
- `skyeagents-bin` for agent instructions and AI-readable workflow files.
- `client-portal-builds` for imported/generated client build lanes such as SupaBoy-style portals and proof receipts.

Current beta commands:

```bash
npm run vault:bins:list
npm run vault:bins:pack -- --bin=devooderator-blog
npm run vault:bins:pack -- --bin=skyeagents-bin
npm run vault:bins:export:dry-run
npm run vault:bins:export
npm run vault:agents:export
npm run vault:delta:upload -- --env-file=env.txt
npm run devooderator:agent:brief
npm run devooderator:agent:draft
```

The pack command writes a file boundary receipt and a SkyeSecure encrypted `.skyesecrets` pack under `.skyevault-out/bins/<bin>/<stamp>/`. The export command runs configured companion bins in priority order, dedupes files that belong to an earlier bin, and writes a single export receipt under `.skyevault-out/bins/exports/`.

Autosync now runs the encrypted delta journal first, the normal repo custody lane second, then the configured bin export lane unless `--skip-bins` is passed. This lets the fast lane protect changed/untracked work quickly, the full repo backup preserve complete Git/repo parity, and `skyeagents-bin` plus `devooderator-blog` get focused custody packs without double-writing the shared agent files.

The delta journal is not a bin. It is the repo-level fast parity lane for dirty source, local-critical files, and tombstones. Bins are named companion exports for agent/site/client folders.

Bin uploads are disabled by default. Upload only when intentionally requested with `--upload`, `--upload-bins`, `SKYEVAULT_BIN_UPLOAD=1`, or `SKYEVAULT_AUTOSYNC_BIN_UPLOAD=1`.

The private handoff file contains passphrase material and must never be committed, printed, pasted into chat, or exposed on public pages.

DevodeRator Field Scribe:

```bash
npm run devooderator:agent:brief
npm run devooderator:agent:draft
```

The Field Scribe reads public-safe proof context, recent changed paths, deploy receipts, and vault state, then writes a private local brief/draft under `.skyevault-out/devooderator-blog-agent/`. It must reference proof paths and public URLs, not raw secret values.

Production boundary:

- This is not yet the full import/export/deploy-from-vault workflow.
- It is the first scoped custody layer for named folders plus companion exports.
- The local autosync daemon still has to run wherever the files live; a remote Worker cannot read untracked local files from a stopped workspace by itself.
- Future work should add gated vault browsing, owner-approved restore/import, deployment from a selected bin, and stress proof against large CDE imports.

Security rule:

AI agents may read `skyevault-bins.json`, this doc, and public receipts. They must not print raw secrets, admin codes, bearer tokens, passphrases, private unlock material, or raw `.env` values.
