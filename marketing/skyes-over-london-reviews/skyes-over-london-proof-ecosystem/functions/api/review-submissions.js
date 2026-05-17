const INDEX_KEY = "review-submissions:index";
const BATCH_SIZE = 5;

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-review-admin-token",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: jsonHeaders,
  });
}

function text(value = "", max = 2000) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function email(value = "") {
  const normalized = text(value, 180).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function serviceCategory(service = "") {
  const raw = service.toLowerCase();
  if (raw.includes("staff") || raw.includes("ae")) return ["staffing"];
  if (raw.includes("automation")) return ["automation"];
  if (raw.includes("ai") || raw.includes("brain")) return ["ai"];
  if (raw.includes("deploy")) return ["deployment"];
  if (raw.includes("portal") || raw.includes("upload")) return ["portal"];
  if (raw.includes("government") || raw.includes("contract")) return ["gov"];
  if (raw.includes("seo") || raw.includes("local")) return ["seo"];
  if (raw.includes("sales") || raw.includes("funnel")) return ["sales"];
  if (raw.includes("brand")) return ["brand"];
  if (raw.includes("web") || raw.includes("site")) return ["web"];
  return ["ops"];
}

function requireAdmin(request, env) {
  const expected = env.SOL_REVIEW_ADMIN_TOKEN || env.REVIEW_ADMIN_TOKEN || env.ADMIN_TOKEN;
  if (!expected) {
    return {
      ok: false,
      response: json({
        ok: false,
        error: "review_admin_token_not_configured",
        message: "Set SOL_REVIEW_ADMIN_TOKEN on Cloudflare Pages before using the 0S QA queue.",
      }, 503),
    };
  }

  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  const headerToken = request.headers.get("x-review-admin-token") || "";
  const token = bearer || headerToken;

  if (token !== expected) {
    return {
      ok: false,
      response: json({ ok: false, error: "unauthorized" }, 401),
    };
  }

  return { ok: true };
}

function queue(env) {
  return env.SOL_REVIEW_QUEUE || env.REVIEW_SUBMISSIONS || env.REVIEW_QUEUE || null;
}

async function readIndex(kv) {
  const value = await kv.get(INDEX_KEY, "json");
  return Array.isArray(value) ? value : [];
}

async function writeIndex(kv, ids) {
  const unique = [...new Set(ids)].slice(-1000);
  await kv.put(INDEX_KEY, JSON.stringify(unique));
  return unique;
}

async function readSubmissions(kv) {
  const ids = await readIndex(kv);
  const records = await Promise.all(ids.map((id) => kv.get(`review-submission:${id}`, "json")));
  return records
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function summarize(records) {
  const approvedUnpublished = records.filter((item) => (
    ["approved_0s_qa", "ready_for_production"].includes(item.status) && !item.publishedAt
  ));
  const remainder = approvedUnpublished.length % BATCH_SIZE;

  return {
    total: records.length,
    pending0sQa: records.filter((item) => item.status === "pending_0s_qa").length,
    approvedUnpublished: approvedUnpublished.length,
    rejected: records.filter((item) => item.status === "rejected").length,
    published: records.filter((item) => item.publishedAt || item.status === "published").length,
    publishThreshold: BATCH_SIZE,
    readyForProduction: approvedUnpublished.length >= BATCH_SIZE,
    neededForNextBatch: remainder === 0
      ? (approvedUnpublished.length === 0 ? BATCH_SIZE : 0)
      : BATCH_SIZE - remainder,
  };
}

async function handleSubmit(request, env) {
  const kv = queue(env);
  if (!kv) {
    return json({
      ok: false,
      error: "review_queue_not_bound",
      message: "Bind a Cloudflare KV namespace as SOL_REVIEW_QUEUE to accept live review submissions.",
    }, 503);
  }

  const body = await request.json().catch(() => ({}));
  if (body.website || body.companyFax) {
    return json({ ok: true, status: "ignored" }, 202);
  }

  const reviewerName = text(body.reviewerName, 120);
  const reviewerEmail = email(body.reviewerEmail);
  const reviewText = text(body.reviewText, 1800);
  const service = text(body.service, 120) || "Business Operations";
  const role = text(body.role, 140) || "Skyes Over London Client";
  const consent = Boolean(body.consent);

  const errors = [];
  if (reviewerName.length < 2) errors.push("reviewerName");
  if (!reviewerEmail) errors.push("reviewerEmail");
  if (reviewText.length < 40) errors.push("reviewText");
  if (!consent) errors.push("consent");

  if (errors.length) {
    return json({ ok: false, error: "validation_failed", fields: errors }, 400);
  }

  const id = `sol-live-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const submission = {
    id,
    status: "pending_0s_qa",
    qaLane: "0s_site_operator_review",
    productionBatchStatus: "waiting_for_five_approved_reviews",
    createdAt: now,
    updatedAt: now,
    reviewerName,
    reviewerEmail,
    role,
    company: text(body.company, 140),
    service,
    categories: serviceCategory(service),
    rating: Math.min(Math.max(Number(body.rating || 5), 1), 5),
    reviewText,
    publicNameConsent: Boolean(body.publicNameConsent),
    publicCompanyConsent: Boolean(body.publicCompanyConsent),
    proofNotes: text(body.proofNotes, 700),
    source: "live_review_wall_submission",
  };

  await kv.put(`review-submission:${id}`, JSON.stringify(submission));
  const ids = await readIndex(kv);
  await writeIndex(kv, [...ids, id]);

  const records = await readSubmissions(kv);
  return json({
    ok: true,
    submissionId: id,
    status: submission.status,
    qaLane: submission.qaLane,
    summary: summarize(records),
  }, 201);
}

async function handleList(request, env) {
  const kv = queue(env);
  if (!kv) return json({ ok: false, error: "review_queue_not_bound" }, 503);

  const url = new URL(request.url);
  if (url.searchParams.get("public") === "stats") {
    return json({ ok: true, summary: summarize(await readSubmissions(kv)) });
  }

  const admin = requireAdmin(request, env);
  if (!admin.ok) return admin.response;

  const records = await readSubmissions(kv);
  return json({ ok: true, summary: summarize(records), submissions: records });
}

async function handleAdminAction(request, env) {
  const kv = queue(env);
  if (!kv) return json({ ok: false, error: "review_queue_not_bound" }, 503);

  const admin = requireAdmin(request, env);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const action = text(body.action, 40);
  const now = new Date().toISOString();

  if (action === "approve" || action === "reject") {
    const id = text(body.id, 80);
    const item = await kv.get(`review-submission:${id}`, "json");
    if (!item) return json({ ok: false, error: "not_found" }, 404);

    item.status = action === "approve" ? "approved_0s_qa" : "rejected";
    item.updatedAt = now;
    item.reviewedAt = now;
    item.reviewedBy = "0s_site_operator";
    item.qaNotes = text(body.qaNotes, 700);
    item.productionBatchStatus = action === "approve"
      ? "approved_waiting_for_five_review_batch"
      : "rejected_by_0s_qa";

    await kv.put(`review-submission:${id}`, JSON.stringify(item));
    const records = await readSubmissions(kv);
    return json({ ok: true, submission: item, summary: summarize(records) });
  }

  if (action === "mark_batch_ready") {
    const records = await readSubmissions(kv);
    const approved = records
      .filter((item) => item.status === "approved_0s_qa" && !item.publishedAt)
      .sort((a, b) => String(a.reviewedAt || a.createdAt).localeCompare(String(b.reviewedAt || b.createdAt)));

    if (approved.length < BATCH_SIZE) {
      return json({
        ok: false,
        error: "not_enough_approved_reviews",
        approvedUnpublished: approved.length,
        required: BATCH_SIZE,
      }, 409);
    }

    const batchId = `sol-review-batch-${now.slice(0, 10)}-${crypto.randomUUID().slice(0, 6)}`;
    const selected = approved.slice(0, BATCH_SIZE);
    await Promise.all(selected.map((item) => {
      const next = {
        ...item,
        status: "ready_for_production",
        productionBatchId: batchId,
        productionBatchStatus: "ready_for_static_wall_publish",
        productionReadyAt: now,
        updatedAt: now,
      };
      return kv.put(`review-submission:${item.id}`, JSON.stringify(next));
    }));

    const nextRecords = await readSubmissions(kv);
    return json({
      ok: true,
      batchId,
      batchSize: selected.length,
      submissions: selected.map((item) => item.id),
      summary: summarize(nextRecords),
    });
  }

  return json({ ok: false, error: "unsupported_action" }, 400);
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { headers: jsonHeaders });
  if (request.method === "POST") return handleSubmit(request, env);
  if (request.method === "GET") return handleList(request, env);
  if (request.method === "PATCH") return handleAdminAction(request, env);
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
