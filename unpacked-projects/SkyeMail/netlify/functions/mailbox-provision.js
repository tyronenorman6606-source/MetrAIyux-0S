const { query } = require("./_db");
const { json, parseJson, verifyAuth } = require("./_utils");
const {
  validateMailboxInput,
  provisionHostedMailbox,
  saveHostedMailbox
} = require("./_mailbox-provider");
const { mirrorPlatformEvent } = require("./_skygate");

exports.handler = async (event) => {
  try {
    if (String(event.httpMethod || "POST").toUpperCase() !== "POST") {
      return json(405, { error: "Method not allowed" });
    }
    const auth = verifyAuth(event);
    const body = parseJson(event);
    const { local, domain, email } = validateMailboxInput(body.local_part || body.localPart, body.domain);

    const userRes = await query("select id, handle, email from users where id=$1 limit 1", [auth.sub]);
    if (!userRes.rows.length) return json(401, { error: "Unauthorized" });
    const user = userRes.rows[0];

    const provisioned = await provisionHostedMailbox({
      email,
      localPart: local,
      domain,
      user,
      claims: {
        fs27_sub: auth.fs27_sub || null,
        fs27_role: auth.fs27_role || null,
        fs27_customer_id: auth.fs27_customer_id || null
      }
    });

    const mailbox = await saveHostedMailbox({
      userId: user.id,
      localPart: local,
      domain,
      email,
      provisioned
    });

    await mirrorPlatformEvent({
      actor: user.email,
      org_id: auth.fs27_customer_id || null,
      ws_id: mailbox.id,
      type: "skymail.mailbox.provisioned",
      meta: {
        skymail_user_id: user.id,
        mailbox_email: mailbox.mailbox_email,
        provider: mailbox.provider,
        provider_account_id: mailbox.provider_account_id,
        status: mailbox.status
      }
    }).catch(() => null);

    return json(200, {
      ok: true,
      mailbox: {
        id: mailbox.id,
        mailbox_email: mailbox.mailbox_email,
        provider: mailbox.provider,
        provider_account_id: mailbox.provider_account_id,
        status: mailbox.status,
        provisioning_status: mailbox.provisioning_status,
        imap_host: mailbox.imap_host,
        smtp_host: mailbox.smtp_host,
        jmap_url: mailbox.jmap_url
      },
      credentials_issued: Boolean(provisioned.credentials_issued),
      credential_note: provisioned.credential_note || null,
      mailbox_password_once: provisioned.mailbox_password_once || null
    });
  } catch (err) {
    return json(err.statusCode || 500, {
      error: err.message || "Server error",
      provider_response: err.providerResponse || null
    });
  }
};
