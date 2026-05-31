const { query } = require("./_db");
const { json } = require("./_utils");
const { requireFs27 } = require("./_skygate");

/*
  Admin recovery export:
  - ONLY returns the stored admin-encrypted private key blob if recovery_enabled=true.
  - Requires a shared FS27/SkyGate admin/operator session.
  - This endpoint does NOT decrypt anything server-side.
  - Admin can decrypt the blob offline with the owner-held recovery private key.
*/
exports.handler = async (event) => {
  try{
    await requireFs27(event, { admin: true });

    const handle = (event.queryStringParameters && event.queryStringParameters.handle) ? String(event.queryStringParameters.handle).trim() : "";
    if(!handle) return json(400, { error: "handle required" });

    const res = await query(
      `select recovery_enabled, recovery_blob_json from users where lower(handle)=lower($1) limit 1`,
      [handle]
    );
    if(!res.rows.length) return json(404, { error: "User not found" });
    if(!res.rows[0].recovery_enabled) return json(403, { error: "Recovery not enabled for this user." });
    if(!res.rows[0].recovery_blob_json) return json(500, { error: "Recovery blob missing." });

    return json(200, { handle, recovery_blob_json: res.rows[0].recovery_blob_json });

  }catch(err){
    return json(500, { error: err.message || "Server error" });
  }
};
