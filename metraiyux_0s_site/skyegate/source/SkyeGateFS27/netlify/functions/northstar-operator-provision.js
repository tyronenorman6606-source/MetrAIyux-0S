import { wrap } from "./_lib/wrap.js";
import crypto from "crypto";
import { buildCors, json } from "./_lib/http.js";
import { provisionWorkspaceBundle, requireOperatorBearer, safeText, slugify } from "./_lib/signinpro.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." }, cors);

  requireOperatorBearer(req);
  const body = await req.json().catch(() => ({}));
  const result = await provisionWorkspaceBundle({
    name: safeText(body.name || body.companyName, 180),
    slug: slugify(body.slug || body.name || body.companyName),
    ownerEmail: safeText(body.ownerEmail || body.email, 254).toLowerCase(),
    ownerPassword: String(body.password || crypto.randomBytes(18).toString("base64url")),
    role: ["owner", "admin", "operator", "viewer"].includes(body.role) ? body.role : "owner",
    plan: safeText(body.plan || "free99-gate-owned", 80),
    communicationEmail: body.communicationEmail || body.ownerEmail || body.email || null,
    skyemail: body.skyemail || null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    initialState: body.initialState && typeof body.initialState === "object" ? body.initialState : null,
    initialBranding: body.initialBranding || body.metadata?.branding || {},
    initialAppSettings: body.initialAppSettings || body.metadata?.appSettings || {},
    initialSecuritySettings: body.initialSecuritySettings || body.metadata?.securitySettings || {},
    provisionedBy: "northstar-signinpro"
  });

  return json(200, {
    ok: true,
    workspace: result.workspace,
    customer: result.customer,
    gateUser: { id: result.gateUser.id, email: result.gateUser.email, primary_customer_id: result.gateUser.primary_customer_id || null },
    workspaceUser: result.workspaceUser,
    oneTimePassword: result.oneTimePassword
  }, cors);
});
