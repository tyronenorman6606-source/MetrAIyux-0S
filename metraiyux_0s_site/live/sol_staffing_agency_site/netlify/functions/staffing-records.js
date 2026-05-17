const { append, get, list, put, recordId } = require("./_lib/store.js");
const { COLLECTIONS, classify, sanitizeData, summaryFields } = require("./_lib/schema.js");
const { json, parseJson } = require("./_lib/http.js");
const { requireAuth } = require("./_lib/auth.js");

exports.handler = async function(event) {
  const auth = await requireAuth(event, { admin: true });
  if (!auth.ok) return auth.response;

  if (event.httpMethod === "GET") return getRecords(event);
  if (event.httpMethod === "POST") return createRecord(event, auth.claims);
  if (event.httpMethod === "PATCH") return updateRecord(event, auth.claims);
  return json(405, { error: "Method not allowed" });
};

async function getRecords(event) {
  const params = new URLSearchParams(event.rawQuery || "");
  if (params.get("summary")) {
    const summary = {};
    const recent = [];
    for (const collection of COLLECTIONS) {
      const records = await list(collection, 100);
      summary[collection] = records.length;
      recent.push(...records.slice(0, 8).map(summaryFields));
    }
    recent.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return json(200, { ok: true, summary, recent: recent.slice(0, 25), collections: COLLECTIONS });
  }

  const collection = params.get("collection") || "leads";
  if (!COLLECTIONS.includes(collection)) return json(400, { error: "Unknown collection" });
  const limit = Math.max(1, Math.min(500, Number(params.get("limit") || 200)));
  return json(200, { ok: true, collection, records: await list(collection, limit) });
}

async function createRecord(event, actor) {
  const body = parseJson(event);
  if (body === null) return json(400, { error: "Invalid JSON" });

  const formName = String(body.form_name || body.formName || "admin-record").slice(0, 120);
  const data = sanitizeData(body.data || body);
  const collection = COLLECTIONS.includes(body.collection) ? body.collection : classify(formName, data);
  const now = new Date().toISOString();
  const record = {
    id: recordId("rec"),
    collection,
    form_name: formName,
    status: String(body.status || "new").slice(0, 80),
    created_at: now,
    updated_at: now,
    source: { page: "admin-dashboard", submitted_by: actor },
    data
  };

  await append(collection, record);
  await audit("record_created", collection, record.id, actor, record);
  return json(200, { ok: true, record });
}

async function updateRecord(event, actor) {
  const body = parseJson(event);
  if (body === null) return json(400, { error: "Invalid JSON" });

  const collection = body.collection;
  const id = body.id;
  if (!COLLECTIONS.includes(collection) || !id) return json(400, { error: "collection and id are required" });

  const record = await get(collection, id);
  if (!record) return json(404, { error: "Record not found" });

  record.status = String(body.status || record.status || "new").slice(0, 80);
  record.updated_at = new Date().toISOString();
  if (body.data && typeof body.data === "object") record.data = { ...record.data, ...sanitizeData(body.data) };
  await put(collection, record);
  await audit("record_updated", collection, record.id, actor, record);
  return json(200, { ok: true, record });
}

async function audit(action, collection, recordIdValue, actor, record) {
  await append("audit", {
    id: recordId("audit"),
    action,
    collection,
    record_id: recordIdValue,
    at: new Date().toISOString(),
    actor,
    summary: summaryFields(record)
  });
}
