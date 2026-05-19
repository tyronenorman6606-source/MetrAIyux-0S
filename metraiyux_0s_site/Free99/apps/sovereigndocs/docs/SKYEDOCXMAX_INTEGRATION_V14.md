# SovereignDocs v14 — SkyeDocxMax Integration

SovereignDocs v14 embeds the uploaded SkyeDocxMax application as the serious document editor runtime while keeping SovereignDocs focused on document automation, governance, template source truth, legal-partner review, packets, reminders, compliance workflows, and commercial order flows.

## Runtime placement

- Bundled editor app: `/skye-docx-max/app/`
- SovereignDocs launch/control page: `/skye-docx-max/`
- Bridge script injected into SkyeDocxMax: `/skye-docx-max/app/sd-bridge.js`

## Handoff flow

1. SovereignDocs assembles a governed draft, prep worksheet, or freeform payload.
2. The API creates a full handoff payload at `POST /api/editor/skye-docx-max/session`.
3. The handoff is stored under `data/editor-handoffs/<handoffId>.json` and summarized in `data/editor-handoff-log.json`.
4. The API returns `launchUrl`, for example `/skye-docx-max/app/?sd_handoff=<handoffId>`.
5. SkyeDocxMax bridge fetches the full payload from `GET /api/editor/skye-docx-max/session/:id`.
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
