const { query } = require("./_db");
const { json, parseJson, verifyAuth } = require("./_utils");
const {
  validateMailboxInput,
  provisionHostedMailbox,
  saveHostedMailbox,
  saveMailboxAlias
} = require("./_mailbox-provider");
const { mirrorPlatformEvent } = require("./_skygate");
const { primaryDomain } = require("./_identity");

exports.handler = async (event) => {
  try {
    if (String(event.httpMethod || "POST").toUpperCase() !== "POST") {
      return json(405, { error: "Method not allowed" });
    }
    const auth = await verifyAuth(event);
    const body = parseJson(event);

    const userRes = await query(
      `select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id
         from users
        where id=$1
        limit 1`,
      [auth.sub]
    );
    if (!userRes.rows.length) return json(401, { error: "Unauthorized" });
    const user = userRes.rows[0];
    const { local, domain, email } = validateMailboxInput(
      body.local_part || body.localPart || user.handle,
      body.domain || primaryDomain()
    );

    const provisioned = await provisionHostedMailbox({
      email,
      localPart: local,
      domain,
      user,
      claims: {
        fs27_sub: auth.fs27_sub || null,
        fs27_role: auth.fs27_role || null,
        fs27_customer_id: auth.fs27_customer_id || user.fs27_customer_id || null,
        fs27_gate_card_id: auth.fs27_gate_card_id || user.fs27_gate_card_id || null
      }
    });

    const identityPatch = {
      ...provisioned,
      workspace_id: user.workspace_id || auth.workspace_id || null,
      skymail_id: user.skymail_id || auth.skymail_id || null,
      fs27_gate_card_id: user.fs27_gate_card_id || auth.fs27_gate_card_id || null
    };
    const mailbox = await saveHostedMailbox({
      userId: user.id,
      localPart: local,
      domain,
      email,
      provisioned: identityPatch
    });

    const alias = await saveMailboxAlias({
      userId: user.id,
      mailboxId: mailbox.id,
      aliasEmail: mailbox.mailbox_email,
      aliasType: "primary",
      displayName: user.handle,
      providerPayload: { source: "mailbox-provision" }
    });

    await query(
      `update users
          set skymail_id=coalesce(skymail_id, $2),
              workspace_id=coalesce(workspace_id, $3),
              fs27_gate_card_id=coalesce(fs27_gate_card_id, $4)
        where id=$1`,
      [
        user.id,
        mailbox.skymail_id || user.skymail_id || auth.skymail_id || null,
        mailbox.workspace_id || user.workspace_id || auth.workspace_id || null,
        mailbox.fs27_gate_card_id || user.fs27_gate_card_id || auth.fs27_gate_card_id || null
      ]
    );

    await mirrorPlatformEvent({
      actor: user.email,
      org_id: auth.fs27_customer_id || user.fs27_customer_id || null,
      ws_id: mailbox.id,
      type: "skymail.mailbox.provisioned",
      meta: {
        skymail_user_id: user.id,
        skymail_id: mailbox.skymail_id || user.skymail_id || auth.skymail_id || null,
        workspace_id: mailbox.workspace_id || user.workspace_id || auth.workspace_id || null,
        mailbox_email: mailbox.mailbox_email,
        primary_alias: alias.alias_email,
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
        jmap_url: mailbox.jmap_url,
        primary_alias: alias.alias_email,
        skymail_id: mailbox.skymail_id || user.skymail_id || auth.skymail_id || null,
        workspace_id: mailbox.workspace_id || user.workspace_id || auth.workspace_id || null,
        fs27_gate_card_id: mailbox.fs27_gate_card_id || user.fs27_gate_card_id || auth.fs27_gate_card_id || null
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
