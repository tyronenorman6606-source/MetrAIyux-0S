const { append, getObject, list, recordId, setObject } = require("./_lib/store.js");
const { json } = require("./_lib/http.js");
const { requireAuth } = require("./_lib/auth.js");

const MAX_BYTES = Number(process.env.SOL_STAFFING_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png"
]);

exports.handler = async function(event) {
  const auth = await requireAuth(event, { admin: true });
  if (!auth.ok) return auth.response;

  if (event.httpMethod === "GET") return getFiles(event);
  if (event.httpMethod === "POST") return uploadFile(event, auth.claims);
  return json(405, { error: "Method not allowed" });
};

async function getFiles(event) {
  const params = new URLSearchParams(event.rawQuery || "");
  const id = params.get("id");
  if (!id) return json(200, { ok: true, files: await list("documents", 250) });

  const files = await list("documents", 1000);
  const meta = files.find(file => file.id === id);
  if (!meta) return json(404, { error: "File not found" });

  const base64 = await getObject(meta.storage_key);
  if (!base64) return json(404, { error: "Stored object not found" });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": meta.content_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeName(meta.name || "document")}"`,
      "Cache-Control": "no-store"
    },
    body: base64,
    isBase64Encoded: true
  };
}

async function uploadFile(event, actor) {
  const contentType = event.headers["content-type"] || event.headers["Content-Type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    return json(400, { error: "Use multipart/form-data with a file field named document" });
  }

  const req = new Request("https://local/upload", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: Buffer.from(event.body || "", event.isBase64Encoded ? "base64" : "utf8")
  });
  const form = await req.formData();
  const file = form.get("document");
  if (!file || typeof file.arrayBuffer !== "function") return json(400, { error: "Missing document file" });
  if (file.size > MAX_BYTES) return json(413, { error: `File exceeds ${MAX_BYTES} bytes` });
  if (!ALLOWED.has(file.type || "application/octet-stream")) return json(415, { error: "File type is not allowed" });

  const id = recordId("doc");
  const filename = safeName(file.name || `${id}.bin`);
  const storageKey = `uploads/${id}-${filename}.b64`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await setObject(storageKey, buffer.toString("base64"));

  const now = new Date().toISOString();
  const meta = {
    id,
    collection: "documents",
    status: "stored",
    name: filename,
    content_type: file.type,
    size: file.size,
    label: String(form.get("label") || "").slice(0, 200),
    linked_record_id: String(form.get("record_id") || "").slice(0, 120),
    storage_key: storageKey,
    created_at: now,
    updated_at: now,
    uploaded_by: actor
  };

  await append("documents", meta);
  await append("audit", {
    id: recordId("audit"),
    action: "document_uploaded",
    collection: "documents",
    record_id: id,
    at: now,
    actor,
    summary: { id, title: filename, type: file.type, status: "stored" }
  });
  return json(200, { ok: true, file: meta });
}

function safeName(name) {
  return String(name || "document").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}
