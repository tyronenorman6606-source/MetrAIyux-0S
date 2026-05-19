# Platform Seed Guide

The seed system is file driven. Add records under `platform-seed/`, list them in `platform-seed/manifest.json`, redeploy, then use **Seed center → Autoload static manifest**.

Supported seed formats:

- `.json`
- `.ndjson`
- `.csv`
- `.md`
- `.txt`
- `.yaml` / `.yml` as text assets

Static hosts cannot safely enumerate a folder at runtime, so the manifest is the redeploy-time discovery contract. This is deliberate: it makes seed changes reviewable, versionable, and reproducible.

Example manifest item:

```json
{ "path": "platform-seed/rubrics/platform-readiness.json", "type": "rubric" }
```

Operator flow:

1. Add or edit seed files.
2. Update `platform-seed/manifest.json`.
3. Redeploy the static site.
4. Open the Seed center and click **Autoload static manifest**.
5. Verify the seed registry count.
6. Export a proof pack if handing work to another operator.
