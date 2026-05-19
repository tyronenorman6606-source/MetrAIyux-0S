# SkyeDocxMax Proof Status

## Proven Locally

- Static PWA editor shell loads from this folder.
- Encrypted `.skye` export/import works through the bundled `SkyeSecure` runtime.
- Direct local `.html` and `.txt` import plus SkyeDocxMax HTML ZIP re-import are exercised by the standalone smokes.
- Browser-local documents, versions, comments, suggestions, metadata, same-folder picker-aware save/open behavior, runtime handle/event evidence for that local chain, and bridge fallback records are exercised by the standalone smokes.
- Accessible live status/error announcements, a persisted local operation journal for import/export/comment/metadata/version actions, and unsaved-draft recovery across reload before autosave lands are exercised by the full standalone smoke.
- Release checks exist for manifests, required files, and static page loading.

## Proof Commands

```bash
node smoke/smoke-proof-contract.mjs
SKYEDOCXMAX_SMOKE_URL=http://127.0.0.1:<local-dev-port>/index.html node smoke/smoke-standalone.mjs
SKYEDOCXMAX_SMOKE_URL=http://127.0.0.1:<local-dev-port>/index.html node smoke-full-standalone.mjs
```

## Not Proven Here

- Microsoft Word/OpenXML `.docx` import/export
- deployed bridge/backend integrations
- multi-user hosted collaboration

## Remaining Blockers

- Browser smokes still require a local static server plus Playwright.
- `.docx` remains a brand/product name, not a proven OpenXML pipeline.
- Cross-app bridge calls only prove local fallback records unless a compatible backend is separately running.
