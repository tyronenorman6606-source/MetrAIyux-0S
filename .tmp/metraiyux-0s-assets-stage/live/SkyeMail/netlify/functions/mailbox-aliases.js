const { query } = require("./_db");
const { json, parseJson, verifyAuth } = require("./_utils");
const {
  getHostedMailbox,
  listMailboxAliases,
  saveMailboxAlias,
  validateAliasInput
} = require("./_mailbox-provider");
const { mirrorPlatformEvent } = require("./_skygate");

exports.handler = async (event) => {
  try {
    const method = String(event.httpMethod || "GET").toUpperCase();
    const auth = verifyAuth(event);
    const userRes = await query(
      `select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id
         from users
        where id=$1
        limit 1`,
      [auth.sub]
    );
    if (!userRes.rows.length) return json(401, { error: "Unauthorized" });
    const user = userRes.rows[0];

    const mailbox = await getHostedMailbox(user.id);
    if (!mailbox) {
      return json(404, { error: "Provision a primary hosted mailbox before adding aliases." });
    }

    if (method === "GET") {
      const aliases = await listMailboxAliases(user.id, mailbox.id);
      return json(200, { ok: true, mailbox, aliases });
    }

    if (method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const body = parseJson(event);
    const alias = validateAliasInput(body.alias_email || body.email || body.alias);
    const created = await saveMailboxAlias({
      userId: user.id,
      mailboxId: mailbox.id,
      aliasEmail: alias.email,
      aliasType: body.alias_type || "custom",
      displayName: body.display_name || body.displayName || null,
      providerPayload: {
        source: "mailbox-aliases",
        requested_by: user.email,
        workspace_id: user.workspace_id || auth.workspace_id || null
      }
    });

    await mirrorPlatformEvent({
      actor: user.email,
      org_id: auth.fs27_customer_id || user.fs27_customer_id || null,
      ws_id: mailbox.id,
      type: "skymail.mailbox.alias_created",
      meta: {
        skymail_user_id: user.id,
        skymail_id: user.skymail_id || auth.skymail_id || null,
        workspace_id: user.workspace_id || auth.workspace_id || null,
        mailbox_email: mailbox.mailbox_email,
        alias_email: created.alias_email,
        alias_type: created.alias_type,
        fs27_gate_card_id: user.fs27_gate_card_id || auth.fs27_gate_card_id || null
      }
    }).catch(() => null);

    return json(200, { ok: true, mailbox, alias: created });
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
