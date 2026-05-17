# Public Engine Map

Use these names in company-facing surfaces.

| Public CitadelDB Name | Internal Implementation Lane | Public Status |
|---|---|---|
| Citadel Postgres Runtime | VPS/private-server Postgres lane | Implemented config |
| Citadel Replicated Runtime | Primary/standby lane | Planned |
| Citadel HA Runtime | Kubernetes HA lane | Manifest-ready |
| Citadel Service Pack | Optional API/realtime/storage lane | Optional |
| Citadel Lab Runtime | Branching/preview/storage-compute experiments | Research-only |

## Rule

External implementation names must not appear in public dashboard copy, landing pages, product one-pagers, sales docs, or README hero copy.

They may appear only in:

```text
internal/
research/
deployment adapter documentation
vendor manifests
```
