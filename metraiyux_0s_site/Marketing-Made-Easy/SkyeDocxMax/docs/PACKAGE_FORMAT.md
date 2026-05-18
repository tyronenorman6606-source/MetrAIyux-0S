# SkyeDocxMax Package Format

## Secure `.skye`

Secure `.skye` files are binary envelopes serialized by `_shared/skye/skyeSecure.js`.

Envelope marker:

```txt
SKYESEC1
```

Envelope fields:

- `format`: `skye-secure-v1`
- `encrypted`: `true`
- `app`: `SkyeDocxMax`
- `alg`: `AES-256-GCM`
- `kdf`: `PBKDF2-SHA256`
- `iterations`: `150000`
- `hint`: optional passphrase hint
- `payload.primary`: encrypted document payload
- `payload.failsafe`: optional recovery-code encrypted payload
- `created_at`: ISO timestamp

Payload fields:

- `meta.app_id`
- `meta.app_version`
- `meta.workspace_id`
- `meta.document_id`
- `meta.title`
- `meta.updated_at`
- `state.content`
- `state.folder_id`
- `state.comments`
- `state.suggestions`
- `state.versions`
- `state.meta_fields`
- `assets[]`

Backward compatibility:

- Import accepts older donor payloads tagged `SkyeDocxPro`.

## HTML ZIP Archive

SkyeDocxMax also exports a self-contained HTML ZIP archive for local review and re-import.

Archive files:

- `manifest.json`
- `document.html`
- `document.txt`
- `<title>.html`
- `assets/*` for embedded binary assets

Manifest fields:

- `format`: `skyedocxmax-html-archive`
- `version`: `1.0.0`
- `app_id`: `SkyeDocxMax`
- `title`
- `document_id`
- `exported_at`
- `html_entry`
- `plain_text_entry`
- `asset_directory`

Honest boundary:

- This archive is for local HTML/TXT portability and SkyeDocxMax re-import.
- Same-folder browser runtime proof comes from File System Access handle/open/save evidence, not from pretending this ZIP is a `.docx` container.
- It is not a Microsoft Word/OpenXML `.docx` package.
