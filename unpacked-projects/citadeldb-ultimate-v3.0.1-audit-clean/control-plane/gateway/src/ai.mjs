import { redactSecrets } from './redact.mjs';

export function aiEnabled() {
  return String(process.env.AI_ASSISTANT_ENABLED || 'false') === 'true';
}

export function availableProviders() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    enabled: aiEnabled()
  };
}

function buildSystemPrompt() {
  return `You are CitadelDB Debug Assistant for Skyes Over London / SOLEnterprises.
Help the operator debug database connection, migration, backup, restore, dashboard, and deployment issues.
Rules:
- Never ask for raw secrets.
- Never print full tokens, passwords, or DATABASE_URL passwords.
- Prefer safe next steps and proof commands.
- Keep answers plain English.
- Respect CitadelDB doctrine: no receipt, no claim.`;
}

export function buildDebugContext({ question, app, readiness, capacity, recentJobs, recentBackups, recentRestores }) {
  const raw = JSON.stringify({
    question,
    app,
    readiness,
    capacity,
    recentJobs,
    recentBackups,
    recentRestores
  }, null, 2);

  const max = Number(process.env.AI_DEBUG_MAX_CHARS || 12000);
  return redactSecrets(raw).slice(0, max);
}

export async function askOpenAI({ question, context }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: `Question:\n${question}\n\nCitadelDB context:\n${context}` }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI request failed with HTTP ${response.status}`);
  }

  const text =
    data.output_text ||
    data.output?.flatMap(item => item.content || []).map(part => part.text || '').join('\n') ||
    JSON.stringify(data);

  return redactSecrets(text);
}

export async function askGemini({ question, context }) {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${buildSystemPrompt()}\n\nQuestion:\n${question}\n\nCitadelDB context:\n${context}`
        }]
      }]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || `Gemini request failed with HTTP ${response.status}`);
  }

  const text =
    data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') ||
    JSON.stringify(data);

  return redactSecrets(text);
}
