# SovereignDocs v14 — SkyeDocxMax Integration

SovereignDocs v14 hands documents to the single canonical 0S SkyeDocxMax editor runtime while keeping SovereignDocs focused on document automation, governance, template source truth, legal-partner review, packets, reminders, compliance workflows, and commercial order flows.

## Runtime placement

- Canonical editor app: `/Marketing-Made-Easy/SkyeDocxMax/editor.html`
- SovereignDocs launch surface: canonical SkyeDocxMax URL with `source=sovereigndocs`
- Bridge: canonical SkyeDocxMax reads `sd_handoff` and posts returns through `/api/sovereigndocs/editor/skye-docx-max/return`

## Handoff flow

1. SovereignDocs assembles a governed draft, prep worksheet, or freeform payload.
2. The API creates a full handoff payload at `POST /api/editor/skye-docx-max/session`.
3. The handoff is stored under `data/editor-handoffs/<handoffId>.json` and summarized in `data/editor-handoff-log.json`.
4. The API returns `launchUrl`, for example `/Marketing-Made-Easy/SkyeDocxMax/editor.html?source=sovereigndocs&sd_handoff=<handoffId>`.
5. The canonical SkyeDocxMax bridge fetches the full payload from `GET /api/editor/skye-docx-max/session/:id`.
6. SkyeDocxMax imports the payload into its editor as an editable document.
7. When the user returns output, SkyeDocxMax posts to `POST /api/editor/skye-docx-max/return`.
8. SovereignDocs stores the returned package in `data/editor-return-log.json` and creates a document lifecycle record.

## Boundary

SkyeDocxMax is the document editor. SovereignDocs is the governed automation/workflow layer. The integration does not create legal advice, attorney review, state-compliance claims, official filing, or outcome guarantees.

## Proof commands

```bash
npm run smoke:v14
npm run smoke:all
```
