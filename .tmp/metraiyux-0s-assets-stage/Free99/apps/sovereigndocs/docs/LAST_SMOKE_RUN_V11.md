# SovereignDocs v11 Last Smoke Run

Command run:

```bash
npm run smoke:all
```

Result: passed.

Verified:

- 10,200 v2.1 source-truth template records wired.
- 15 categories and 51 jurisdictions wired.
- 37 official-source workflows wired.
- 6,069 high-risk records governed.
- 20,710 crawlable `index.html` pages checked by multipage smoke.
- v9 partner-review workflow still passes under v11.
- v10 commercial-core workflow still passes under v11.
- Internal link check passed.
- Public overclaim scan passed.
- Public copy scan passed.
- v11 repo-readiness smoke passed.

After the smoke run, runtime JSON/NDJSON files were reset for clean repo handoff. Smoke/proof residue is stored under `data/fixtures/`.
