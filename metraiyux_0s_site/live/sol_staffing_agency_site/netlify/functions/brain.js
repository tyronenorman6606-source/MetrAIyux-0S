const { json, parseJson } = require("./_lib/http.js");
const { requireAuth } = require("./_lib/auth.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;

  const body = parseJson(event);
  if (body === null) return json(400, { error: "Invalid JSON" });

  const prompt = String(body.prompt || body.message || "").slice(0, 8000).trim();
  if (!prompt) return json(400, { error: "Missing prompt" });

  const system = String(body.system || defaultSystem()).slice(0, 4000);

  try {
    if (process.env.OLLAMA_BASE_URL) {
      const result = await callOllama({ prompt, system });
      return json(200, {
        ok: true,
        mode: "ollama",
        model: process.env.OLLAMA_MODEL || "llama3.1",
        answer: result
      });
    }

    if (process.env.GPU_BRAIN_ENDPOINT) {
      const result = await callOpenAICompatible({ prompt, system });
      return json(200, {
        ok: true,
        mode: "gpu-openai-compatible",
        model: process.env.GPU_BRAIN_MODEL || "local-model",
        answer: result
      });
    }
  } catch (error) {
    return json(502, {
      ok: false,
      error: "Live brain endpoint failed",
      detail: String(error.message || error).slice(0, 500)
    });
  }

  return json(503, {
    ok: false,
    mode: "not_configured",
    answer: "Live GPU/Ollama brain is wired but not configured. Set OLLAMA_BASE_URL + OLLAMA_MODEL, or GPU_BRAIN_ENDPOINT + GPU_BRAIN_MODEL, then retry from an authenticated Skyegate FS27 session."
  });
};

function defaultSystem() {
  return [
    "You are the private Skyes Over London Staffing operating brain.",
    "Help operators with staffing intake, CRM, ATS, AE sales, candidate workflows, government-safe claims, timesheets, risks, and admin decisions.",
    "Do not invent UEI, CAGE, SAM, certifications, insurance, bonding, open jobs, testimonials, legal advice, tax advice, payroll advice, or HR compliance conclusions.",
    "When uncertain, ask for verification and route the issue to the admin dashboard record system."
  ].join(" ");
}

async function callOllama({ prompt, system }) {
  const base = process.env.OLLAMA_BASE_URL.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.OLLAMA_API_KEY ? { Authorization: `Bearer ${process.env.OLLAMA_API_KEY}` } : {})
    },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || "llama3.1",
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      options: {
        temperature: Number(process.env.OLLAMA_TEMPERATURE || 0.2)
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ollama HTTP ${res.status}`);
  return data?.message?.content || data?.response || "";
}

async function callOpenAICompatible({ prompt, system }) {
  const endpoint = process.env.GPU_BRAIN_ENDPOINT;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.GPU_BRAIN_API_KEY ? { Authorization: `Bearer ${process.env.GPU_BRAIN_API_KEY}` } : {})
    },
    body: JSON.stringify({
      model: process.env.GPU_BRAIN_MODEL || "local-model",
      temperature: Number(process.env.GPU_BRAIN_TEMPERATURE || 0.2),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || data.error || `GPU endpoint HTTP ${res.status}`);
  return data?.choices?.[0]?.message?.content || data?.answer || data?.response || "";
}
