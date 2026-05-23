import { wrap } from "./_lib/wrap.js";
import { buildCors, json, badRequest, getBearer } from "./_lib/http.js";
import { audit } from "./_lib/audit.js";
import { sendRecoveryCodesEmail } from "./_lib/emailAuth.js";
import { listPinCredentials, rotateRecoveryCodes } from "./_lib/pinAuth.js";
import { verifySessionToken } from "./_lib/sessions.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const verified = await verifySessionToken(getBearer(req));
  if (!verified?.user) return json(401, { error: "Unauthorized" }, cors);

  let body;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON", cors); }

  const credentials = await listPinCredentials(verified.user.id);
  const credential = credentials.find((item) => item.id === body.credential_id || item.gate_id === String(body.gate_id || "").replace(/\D/g, "")) || credentials[0];
  if (!credential) return badRequest("No PIN credential exists for this user", cors);

  const codes = await rotateRecoveryCodes({ credentialId: credential.id, userId: verified.user.id });
  const delivery = await sendRecoveryCodesEmail(verified.user, { gateId: credential.gate_id, codes });
  await audit("auth", "AUTH_RECOVERY_ROTATE", `user:${verified.user.id}`, { gate_id: credential.gate_id, credential_id: credential.id, email_delivery: delivery });

  return json(200, {
    ok: true,
    gate_id: credential.gate_id,
    credential_id: credential.id,
    recovery_codes: codes,
    recovery_delivery: delivery,
    recovery_notice: delivery.delivered
      ? "Fresh recovery codes were sent through the configured email provider and are returned once in this response."
      : "No email delivery provider is configured, so this is preview mode. Store the returned codes now."
  }, cors);
});
