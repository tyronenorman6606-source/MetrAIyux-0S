# DOCX Support

This release does not claim verified Microsoft Word/OpenXML `.docx` import/export.

Supported export paths:

- Encrypted `.skye`
- TXT
- HTML
- HTML ZIP
- PDF through the browser print flow

Supported import path:

- Encrypted `.skye`
- Direct local `.html`
- Direct local `.txt`
- SkyeDocxMax HTML ZIP archive
- Vault backup ZIP restore

When the browser provides the File System Access API, SkyeDocxMax uses the native picker for same-folder local open/save behavior during the active runtime. The runtime also records session-local handle/open/save evidence so browser smokes can prove that local chain without claiming a real OpenXML `.docx` implementation. That improves local proof and operator ergonomics, but it is still not a Microsoft Word/OpenXML `.docx` pipeline.

The `Docx` term is a product brand term in this release. A future premium module can add real OpenXML parsing/generation with LibreOffice smoke validation.
