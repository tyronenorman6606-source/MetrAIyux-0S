SKYESOVERLONDON • DocuMorph (Real App Upgrade)

What you have here

Public site structure
- Landing page: /
- App (PWA): /app/
- Privacy: /privacy
- Terms: /terms
- AI markdown: /ai.md
- Dynamic sitemap: /sitemap.xml (served by function)
- Dynamic robots: /robots.txt (served by function)

What you have here
- Offline-first PWA (works with local IndexedDB storage even with ZERO backend)
- Optional Neon (Postgres) cloud sync (per-device clientId, no auth)
- Optional server-side AI analysis (/api/analyze) using:
  - SKYESOVERLONDON • SkyesFlash (Gemini)
  - SKYESOVERLONDON • SkyesCrown (OpenAI)

IMPORTANT: Netlify Functions requirement
- /api/* routes are Netlify Functions.
- Netlify drag-and-drop static deploy WILL NOT run functions.
- To enable Neon + server AI, deploy via Git (Netlify UI) or Netlify CLI so functions build and run.

Environment variables (Netlify Site Settings → Environment variables)
- NEON_DATABASE_URL   (Neon connection string)
- GEMINI_API_KEY      (server-side Gemini)
- GEMINI_MODEL        (optional override; default: gemini-2.5-flash-preview-09-2025)
- OPENAI_API_KEY      (server-side OpenAI)
- OPENAI_MODEL        (optional override; default: gpt-4o-mini)

Neon schema
- You can run db/schema.sql in Neon SQL Editor (optional).
- The function auto-creates the table/index on first request.

How the app behaves
- Storage Mode = Local: everything stays on device (IndexedDB)
- Storage Mode = Neon Cloud: app keeps local copy + syncs to Neon when online
- AI Mode = Server (recommended): calls /api/analyze (keys stay on server)
- AI Mode = Local Key: calls provider from the browser (functional but exposes keys)

Routes
- GET  /api/ping
- POST /api/analyze          body: { engine: 'skyes-gemini'|'skyes-openai', text: '...' }
- GET  /api/documents        header: X-Client-Id
- POST /api/documents        header: X-Client-Id, body: { document: { ... } }
- GET  /api/documents/:id    header: X-Client-Id
- DELETE /api/documents/:id  header: X-Client-Id
