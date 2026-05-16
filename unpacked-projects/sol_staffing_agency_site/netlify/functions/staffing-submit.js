const { append, recordId } = require("./_lib/store.js");
const { classify, sanitizeData, summaryFields } = require("./_lib/schema.js");
const { json, parseJson, safeIp, getHeader } = require("./_lib/http.js");
const { authFromEvent } = require("./_lib/auth.js");

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseJson(event);
  if (body === null) return json(400, { error: "Invalid JSON" });
  if (body["bot-field"]) return json(200, { ok: true, skipped: true });

  const formName = String(body["form-name"] || body.form_name || body.formName || "general-intake").slice(0, 120);
  const data = sanitizeData(body);
  delete data["form-name"];
  delete data.form_name;
  delete data.formName;

  const collection = classify(formName, data);
  const now = new Date().toISOString();
  const auth = await authFromEvent(event);
  const record = {
    id: recordId("rec"),
    collection,
    form_name: formName,
    status: "new",
    created_at: now,
    updated_at: now,
    source: {
      page: data.page_url || getHeader(event, "referer") || "",
      ip: safeIp(event),
      user_agent: getHeader(event, "user-agent") || "",
      submitted_by: auth.claims || null
    },
    data
  };

  await append(collection, record);
  await append("audit", {
    id: recordId("audit"),
    action: "form_submitted",
    collection,
    record_id: record.id,
    at: now,
    actor: auth.claims || { type: "public" },
    summary: summaryFields(record)
  });

  return json(200, { ok: true, record: summaryFields(record) });
};
