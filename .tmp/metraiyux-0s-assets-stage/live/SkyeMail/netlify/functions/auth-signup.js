const bcrypt = require("bcryptjs");
const { query } = require("./_db");
const { json, parseJson } = require("./_utils");
const { getBearer, introspectToken } = require("./_skygate");
const {
  normalizeEmail,
  normalizeHandle,
  makeSkyeMailId,
  makeWorkspaceId,
  makeGateCardId
} = require("./_identity");

function validHandle(h){
  return /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(h || "");
}

exports.handler = async (event) => {
  try{
    const body = parseJson(event);
    const {
      handle, email, password,
      rsa_public_key_pem,
      vault_wrap_json,
      recovery_enabled,
      recovery_blob_json
    } = body;

    const fs27Token = getBearer(event) || String(body.fs27_token || body.skygate_token || "").trim();
    const requireFs27 = String(process.env.SKYMAIL_SIGNUP_REQUIRES_FS27 || "").toLowerCase() === "true";
    const fs27 = fs27Token ? await introspectToken(fs27Token) : null;
    if(requireFs27 && !fs27) return json(401, { error: "Skyegate FS27 auth is required before SkyeMail signup." });

    const normalizedHandle = normalizeHandle(handle || fs27?.email || fs27?.username || email);
    const normalizedEmail = normalizeEmail(fs27?.email || fs27?.username || email);
    if(!validHandle(normalizedHandle)) return json(400, { error: "Invalid handle format." });
    if(!normalizedEmail || !normalizedEmail.includes("@")) return json(400, { error: "Valid email required." });
    if(!password || password.length < 10) return json(400, { error: "Password must be at least 10 characters." });
    if(!rsa_public_key_pem || !rsa_public_key_pem.includes("BEGIN PUBLIC KEY")) return json(400, { error: "rsa_public_key_pem required (PEM)." });
    if(!vault_wrap_json) return json(400, { error: "vault_wrap_json required." });

    const password_hash = await bcrypt.hash(password, 12);
    const recoveryEnabled = !!recovery_enabled;
    const recoveryBlob = recoveryEnabled ? (recovery_blob_json || null) : null;
    const fs27Sub = fs27?.sub || null;
    const fs27CustomerId = fs27?.customer_id || fs27?.org || null;
    const fs27GateCardId = makeGateCardId({
      fs27CardId: fs27?.gate_card_id || fs27?.card?.id || fs27?.gate_card?.id || null,
      fs27Sub,
      email: normalizedEmail,
      handle: normalizedHandle
    });
    const skymailId = makeSkyeMailId({ email: normalizedEmail, handle: normalizedHandle, fs27Sub });
    const workspaceId = makeWorkspaceId({ email: normalizedEmail, handle: normalizedHandle, fs27CustomerId, fs27Sub });

    const ures = await query(
      `insert into users(
         handle, email, password_hash, skymail_id, workspace_id,
         fs27_sub, fs27_customer_id, fs27_gate_card_id, fs27_card_json,
         recovery_enabled, recovery_blob_json
       )
       values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
       returning id`,
      [
        normalizedHandle,
        normalizedEmail,
        password_hash,
        skymailId,
        workspaceId,
        fs27Sub,
        fs27CustomerId,
        fs27GateCardId,
        fs27 ? JSON.stringify(fs27.card || fs27.gate_card || fs27.skyegate_card || null) : null,
        recoveryEnabled,
        recoveryBlob
      ]
    );
    const userId = ures.rows[0].id;

    await query(
      `insert into user_keys(user_id, version, is_active, rsa_public_key_pem, vault_wrap_json)
       values($1, 1, true, $2, $3)`,
      [userId, rsa_public_key_pem, vault_wrap_json]
    );

    return json(200, { ok: true });

  }catch(err){
    const msg = (err && err.message) ? err.message : "Server error";
    if(/duplicate key value violates unique constraint/i.test(msg)){
      return json(409, { error: "Handle or email already exists." });
    }
    return json(500, { error: msg });
  }
};
