# Reliquary Operations

Reliquary is the local backup/export/rollback lane for SoveReign13 Node OS.

## Create backup

```bash
s13-backup ./my-repo
```

This writes:

- `.s13/reliquary/<name>.tar.gz`
- `.s13/reliquary/<name>.manifest.json`

The manifest includes file inventory and archive SHA256.

## Verify backup

```bash
s13-reliquary verify .s13/reliquary/<name>.manifest.json
```

## List backups

```bash
s13-reliquary list .s13/reliquary
```

## Restore manually

Restoration is intentionally manual in v0.3.0:

```bash
mkdir /tmp/recovered
 tar -xzf .s13/reliquary/<name>.tar.gz -C /tmp/recovered
```

Manual restore avoids overwriting an active repo by accident.
