# UPGRADE NOTES — v1.3.0

v1.3 turns SkyeArcade from a ten-game launcher with daily contracts into a stronger replay vault.

## Added

- Vault Gauntlet: five ordered game targets with persistent progress and a Gauntlet Crown achievement.
- Pressure Mode: a harder global ruleset that changes actual mechanical values across most games.
- Lore Codex: win-gated doctrine cards for all ten games.
- Mastery system: three wins on a game marks that door as mastered and unlocks the First Mastery Sigil achievement.
- Lore Vault Unsealed achievement for unlocking five codex entries.
- Pressure Mode Crown achievement for winning under harder rules.

## Hardened

- Save schema now preserves gauntlet state while remaining compatible with older saves.
- Import path now accepts gauntlet data when present and falls back safely when missing.
- Service worker cache key bumped to v1.3 to avoid stale cached assets.

## No auth added

No account system, login screen, backend token handling, database, or user table was added.
