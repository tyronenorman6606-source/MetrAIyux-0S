# Proof Commands

Run the full proof suite:

```bash
npm run smoke
```

This verifies static integrity, app config loading, local runtime API behavior, local privacy status, and backup create/list/download/restore behavior.

Run individual gates:

```bash
npm run proof:static
npm run proof:runtime
npm run proof:api
```
