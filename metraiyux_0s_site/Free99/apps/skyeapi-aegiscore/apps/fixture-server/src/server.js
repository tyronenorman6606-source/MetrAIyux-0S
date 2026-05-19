#!/usr/bin/env node
import http from "node:http";

const port = Number(process.env.SKYEAPI_FIXTURE_PORT || 8789);

function send(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-skye-fixture": "true"
  });
  res.end(JSON.stringify({ ...body, fixture: true, secrets_exposed: false }, null, 2));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(text || "{}"); } catch { return Object.fromEntries(new URLSearchParams(text)); }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  if (url.pathname === "/health") return send(res, 200, { ok: true, service: "skyeapi-fixture-server", note: "Deterministic CI endpoints only; not evidence of live provider success." });

  if (url.pathname === "/resend/emails" && req.method === "POST") {
    const body = await readBody(req);
    if (!body.to || !body.subject) return send(res, 400, { ok: false, error: "Fixture email requires to and subject." });
    return send(res, 200, { id: "fixture_email_001", to: body.to, subject: body.subject });
  }

  if (url.pathname.includes("/Messages.json") && req.method === "POST") {
    const body = await readBody(req);
    if (!body.To || !body.Body) return send(res, 400, { ok: false, error: "Fixture SMS requires To and Body." });
    return send(res, 200, { sid: "SM_fixture_001", to: body.To });
  }

  if (url.pathname === "/openai/chat/completions" && req.method === "POST") {
    const body = await readBody(req);
    const prompt = body.messages?.at?.(-1)?.content || "";
    return send(res, 200, { choices: [{ message: { content: `Fixture response: ${String(prompt).slice(0, 80)}` } }] });
  }

  if (url.pathname === "/stripe/checkout/sessions" && req.method === "POST") {
    return send(res, 200, { id: "cs_fixture_001", url: "https://fixture.skyeapi.local/checkout/cs_fixture_001" });
  }

  if (url.pathname === "/webhooks/echo" && req.method === "POST") {
    const body = await readBody(req);
    return send(res, 202, { received: true, type: body.type || "fixture.event" });
  }

  send(res, 404, { ok: false, error: "Fixture endpoint not found." });
});

server.listen(port, () => {
  console.log(JSON.stringify({ ok: true, service: "skyeapi-fixture-server", port, note: "Fake provider endpoints for deterministic CI only." }));
});
