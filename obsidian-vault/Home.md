---
title: MetrAIyux 0S Project Vault
brain: true
tags:
  - metraiyux
  - command-center
  - source-of-truth
---

# MetrAIyux 0S Project Vault

This vault is the human command center for MetrAIyux 0S, SkyeGateFS27, proof systems, client handoff material, deployment blockers, and decision memory.

## Start Here

- [[00-command-center/Current Production State]]
- [[00-command-center/Next Operator Actions]]
- [[10-production/Production Blockers]]
- [[10-production/Live Surface Registry]]
- [[20-proof/Proof Ledger]]
- [[30-sales/Sales And Handoff Map]]

## Vault Rules

- Add `brain: true` in frontmatter only when a note is safe to export into the local browser brain.
- Keep private credentials, real tokens, customer secrets, and unverified claims out of brain-exported notes.
- Use templates in [[90-templates/Decision Record Template]], [[90-templates/Proof Receipt Template]], and [[90-templates/Operator Action Template]] when adding durable notes.

## Sync

Run the repo-local Obsidian sync command after changing curated notes. The detailed command allowlist lives outside the deployable static site in repo operator docs.

The sync writes `metraiyux_0s_site/brain/obsidian-sync.json`, which the local brain loads alongside the existing knowledge base.
