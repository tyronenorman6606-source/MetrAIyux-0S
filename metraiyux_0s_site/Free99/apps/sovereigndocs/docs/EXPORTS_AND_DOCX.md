# SovereignDocs Export Lanes

Implemented static export lanes:

✅ Markdown
✅ HTML
✅ Package JSON
✅ Word-compatible `.doc`
✅ Browser print/save-to-PDF

Implemented API-mode export lane:

✅ True `.docx` via `POST /api/documents/export-docx`

The DOCX route requires boundary acceptance. It creates a minimal Office Open XML zip buffer server-side. It is intentionally API-mode only because static Netlify drop hosting cannot run server-side file generation.
