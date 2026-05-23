/**
 * SKYESOVERLONDON DocuMorph API (Netlify Function)
 * - /api/ping
 * - /api/analyze            (Gemini or OpenAI; server-key recommended)
 * - /api/documents          (GET list, POST upsert)
 * - /api/documents/:id      (GET one, DELETE one)
 *
 * Env:
 *   NEON_DATABASE_URL
 *   GEMINI_API_KEY
 *   GEMINI_MODEL            (optional)
 *   OPENAI_API_KEY
 *   OPENAI_MODEL            (optional)
 */

const { Pool } = require('pg');

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-09-2025';
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const pool = process.env.NEON_DATABASE_URL
  ? new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })
  : null;

let schemaReady = false;

async function ensureSchema() {
  if (!pool || schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documorph_documents (
      id uuid PRIMARY KEY,
      client_id text NOT NULL,
      file_name text NOT NULL,
      upload_date timestamptz NOT NULL DEFAULT now(),
      stats jsonb NOT NULL,
      summary text,
      sections jsonb NOT NULL,
      flashcards jsonb NOT NULL,
      questions jsonb NOT NULL,
      raw_text text NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_documorph_client_date
      ON documorph_documents (client_id, upload_date DESC);
  `);
  schemaReady = true;
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function bad(statusCode, message, extra = {}) {
  return json(statusCode, { ok: false, error: message, ...extra });
}

function readClientId(event) {
  const h = event.headers || {};
  return h['x-client-id'] || h['X-Client-Id'] || h['x-clientid'] || '';
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // try to extract JSON object from surrounding text
    const m = String(text || '').match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e2) {}
    }
    return null;
  }
}

async function analyzeWithGemini(text) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, error: 'Missing GEMINI_API_KEY' };

  const prompt = `Perform high-level analysis on this educational text. Output strictly JSON with keys: "flashcards" (8 items, {term, context}), "questions" (8 items, {id, question, answer, options}), and "summary" (2 sentences). Text: ${String(text || '').slice(0, 30000)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  const data = await r.json().catch(() => ({}));
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = safeJsonParse(raw);
  if (parsed && parsed.flashcards && parsed.questions && parsed.summary) {
    return { ok: true, engine: 'skyes-gemini', engineLabel: 'SKYESOVERLONDON • SkyesFlash', ...parsed };
  }
  return { ok: false, error: 'Gemini parse failed', raw };
}

async function analyzeWithOpenAI(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, error: 'Missing OPENAI_API_KEY' };

  const prompt = `Perform high-level analysis on this educational text. Output strictly JSON with keys: "flashcards" (8 items, {term, context}), "questions" (8 items, {id, question, answer, options}), and "summary" (2 sentences). Text: ${String(text || '').slice(0, 30000)}`;

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON. No markdown. No code fences.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const data = await r.json().catch(() => ({}));
  const raw = data?.choices?.[0]?.message?.content || '';
  const parsed = safeJsonParse(raw) || safeJsonParse(String(raw).replace(/```json|```/g, ''));
  if (parsed && parsed.flashcards && parsed.questions && parsed.summary) {
    return { ok: true, engine: 'skyes-openai', engineLabel: 'SKYESOVERLONDON • SkyesCrown', ...parsed };
  }
  return { ok: false, error: 'OpenAI parse failed', raw, data: data?.error ? { error: data.error } : undefined };
}

function normalizePath(eventPath) {
  const p = (eventPath || '').split('?')[0];
  return p
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '')
    || '/';
}

exports.handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  const path = normalizePath(event.path);

  if (method === 'OPTIONS') {
    return json(200, { ok: true }, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Client-Id, x-client-id',
    });
  }

  // --- ping ---
  if (method === 'GET' && (path === '/ping' || path === '/')) {
    return json(200, {
      ok: true,
      service: 'SKYESOVERLONDON DocuMorph API',
      neon: !!pool,
      now: Date.now(),
      geminiModel: DEFAULT_GEMINI_MODEL,
      openaiModel: DEFAULT_OPENAI_MODEL,
    });
  }

  // --- analyze ---
  if (method === 'POST' && path === '/analyze') {
    const body = safeJsonParse(event.body || '{}') || {};
    const text = body.text || '';
    const engine = body.engine || 'skyes-gemini';

    try {
      const result = engine === 'skyes-openai'
        ? await analyzeWithOpenAI(text)
        : await analyzeWithGemini(text);

      if (result && result.ok) return json(200, result);
      return bad(502, result?.error || 'Analyze failed', { detail: result });
    } catch (e) {
      return bad(500, 'Analyze exception', { detail: String(e && e.message ? e.message : e) });
    }
  }

  // --- documents (Neon) ---
  const clientId = readClientId(event);
  if ((path === '/documents' || path.startsWith('/documents/')) && !clientId) {
    return bad(401, 'Missing X-Client-Id header');
  }
  if ((path === '/documents' || path.startsWith('/documents/')) && !pool) {
    return bad(503, 'Neon disabled: set NEON_DATABASE_URL');
  }

  if (path === '/documents' && method === 'GET') {
    try {
      await ensureSchema();
      const { rows } = await pool.query(
        `SELECT id, file_name AS "fileName",
                (extract(epoch from upload_date) * 1000)::bigint AS "uploadDate",
                stats, summary,
                sections, flashcards, questions,
                raw_text AS "rawText"
         FROM documorph_documents
         WHERE client_id = $1
         ORDER BY upload_date DESC
         LIMIT 200`,
        [clientId]
      );
      return json(200, { ok: true, documents: rows });
    } catch (e) {
      return bad(500, 'List failed', { detail: String(e && e.message ? e.message : e) });
    }
  }

  if (path === '/documents' && method === 'POST') {
    const body = safeJsonParse(event.body || '{}') || {};
    const doc = body.document;
    if (!doc || !doc.id) return bad(400, 'Missing document');

    try {
      await ensureSchema();
      await pool.query(
        `INSERT INTO documorph_documents
          (id, client_id, file_name, upload_date, stats, summary, sections, flashcards, questions, raw_text)
         VALUES
          ($1, $2, $3, to_timestamp($4/1000.0), $5::jsonb, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10)
         ON CONFLICT (id) DO UPDATE SET
          file_name = EXCLUDED.file_name,
          upload_date = EXCLUDED.upload_date,
          stats = EXCLUDED.stats,
          summary = EXCLUDED.summary,
          sections = EXCLUDED.sections,
          flashcards = EXCLUDED.flashcards,
          questions = EXCLUDED.questions,
          raw_text = EXCLUDED.raw_text
         WHERE documorph_documents.client_id = $2`,
        [
          doc.id,
          clientId,
          doc.fileName || 'document.pdf',
          Number(doc.uploadDate || Date.now()),
          JSON.stringify(doc.stats || {}),
          doc.content?.summary || '',
          JSON.stringify(doc.content?.sections || []),
          JSON.stringify(doc.content?.flashcards || []),
          JSON.stringify(doc.content?.questions || []),
          doc.content?.rawText || '',
        ]
      );
      return json(200, { ok: true });
    } catch (e) {
      return bad(500, 'Upsert failed', { detail: String(e && e.message ? e.message : e) });
    }
  }

  // /documents/:id
  const m = path.match(/^\/documents\/([0-9a-fA-F-]{8,})$/);
  if (m && method === 'GET') {
    try {
      await ensureSchema();
      const id = m[1];
      const { rows } = await pool.query(
        `SELECT id, file_name AS "fileName",
                (extract(epoch from upload_date) * 1000)::bigint AS "uploadDate",
                stats, summary,
                sections, flashcards, questions,
                raw_text AS "rawText"
         FROM documorph_documents
         WHERE client_id = $1 AND id = $2
         LIMIT 1`,
        [clientId, id]
      );
      if (!rows[0]) return bad(404, 'Not found');
      return json(200, { ok: true, document: rows[0] });
    } catch (e) {
      return bad(500, 'Get failed', { detail: String(e && e.message ? e.message : e) });
    }
  }

  if (m && method === 'DELETE') {
    try {
      await ensureSchema();
      const id = m[1];
      await pool.query(`DELETE FROM documorph_documents WHERE client_id = $1 AND id = $2`, [clientId, id]);
      return json(200, { ok: true });
    } catch (e) {
      return bad(500, 'Delete failed', { detail: String(e && e.message ? e.message : e) });
    }
  }

  return bad(404, 'Not found', { path, method });
};
