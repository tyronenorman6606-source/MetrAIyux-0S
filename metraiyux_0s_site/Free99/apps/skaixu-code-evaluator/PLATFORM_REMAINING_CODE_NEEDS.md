# Current Remaining Code Needs After 2.5.0

✅ Shared workspace API contract repaired and now has optimistic concurrency.
✅ Seed ETL path handling remains locked.
✅ Workspace version history now has stale-write conflict handling and version pruning.
✅ Build execution receipts now block missing stages instead of false-passing.
✅ Task runner now writes materialized patch artifacts and receipts.
✅ Closure proof orchestrator exists.

Still open:

☐ Install/run real Playwright browser E2E in an environment with browser dependencies.
☐ Continue splitting `index.html` into smaller frontend modules.
☐ Replace tmp/file workspace store with durable DB/object storage adapter for production.
☐ Add deeper rubric/plugin version lifecycle with migration/rollback.
☐ Add real approval gates around expensive/externally mutating task runners.

---

# Remaining Code Needs After 2.4.0

The previous critical code gaps have been addressed in this package:

✅ Shared workspace API contract fixed.
✅ Seed ETL path handling locked down.
✅ Platform browser helper logic split into `src/client/` modules.
✅ Playwright browser proof runner added.
✅ Workspace version history added.
✅ Build execution adapter added.
✅ Task runner receipts and proof loops added.
✅ Large-folder seed chunking, dedupe, and provenance added.

Remaining code work is now narrower:

☐ Reduce `index.html` further by moving UI panels into separate source modules or a framework component app.
☐ Add a database-backed shared workspace store for production multi-tenant persistence.
☐ Add a governed autonomous agent worker that consumes task receipts and patch bundles server-side.
☐ Add real repository adapters for GitHub/GitLab/local filesystem patch application.
☐ Add rubric/plugin semantic version migration flows.
☐ Add signed proof packs if client/legal handoff requires tamper evidence.
