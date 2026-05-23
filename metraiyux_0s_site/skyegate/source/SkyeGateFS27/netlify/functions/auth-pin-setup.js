import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest, getBearer } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { sendRecoveryCodesEmail } from "./_lib/emailAuth.js";
import { createPinCredential, listPinCredentials } from "./_lib/pinAuth.js";
import { verifySessionToken } from "./_lib/sessions.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (!["GET", "POST"].includes(req.method)) return json(405, { error: "Method not allowed" }, cors);

  const verified = await verifySessionToken(getBearer(req));
  if (!verified?.user) return json(401, { error: "Unauthorized" }, cors);

  if (req.method === "GET") {
    return json(200, { credentials: await listPinCredentials(verified.user.id) }, cors);
  }

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const pin = (body.pin || "").toString();
  const label = (body.label || "Primary PIN gate").toString();
  const created = await createPinCredential({ user: verified.user, pin, label });
  const delivery = await sendRecoveryCodesEmail(verified.user, {
    gateId: created.gate_id,
    codes: created.recovery_codes
  });

  await audit("auth", "AUTH_PIN_SETUP", `user:${verified.user.id}`, {
    gate_id: created.gate_id,
    credential_id: created.credential_id,
    email_delivery: delivery
  });

  return json(200, {
    ok: true,
    gate_id: created.gate_id,
    credential_id: created.credential_id,
    recovery_codes: created.recovery_codes,
    recovery_delivery: delivery,
    recovery_notice: delivery.delivered
      ? "Recovery codes were sent through the configured email provider and are returned once in this setup response."
      : "No email delivery provider is configured, so this is preview mode. Store the returned codes now."
  }, cors);
});
