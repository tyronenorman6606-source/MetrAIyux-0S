import { json } from '@netlify/functions';

export default async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, { status: 405 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured for Functions.' }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim();
  const model = String(body.model || process.env.OPENAI_MODEL || 'gpt-5').trim();
  const corpus = Array.isArray(body.corpus) ? body.corpus.slice(0, 80) : [];

  if (!prompt) return json({ error: 'Prompt is required.' }, { status: 400 });

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: 'You are helping a user search and reason over a personal file vault. Use only the supplied vault corpus. Be practical, concise, and cite file paths plainly when useful. If the corpus is insufficient, say so.'
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `User request:\n${prompt}\n\nVault corpus:\n${JSON.stringify(corpus, null, 2)}`
            }
          ]
        }
      ],
      text: { format: { type: 'text' } }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: data?.error?.message || `OpenAI request failed (${response.status}).` }, { status: response.status || 500 });
  }
  return json({
    ok: true,
    model,
    text: data.output_text || ''
  });
};
