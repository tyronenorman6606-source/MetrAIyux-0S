const { query } = require("./_db");
const { json, parseJson, verifyAuth, requireEnv, hybridEncryptNode } = require("./_utils");
const { getHostedMailbox, zohoApiConfigured, zohoSendMail } = require("./_mailbox-provider");
const { mirrorPlatformEvent } = require("./_skygate");

function escapeHtml(s){
  return String(s || "").replace(/[<>&"]/g, c => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]));
}

function stripHtml(s){
  return String(s || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function addressList(value){
  if(Array.isArray(value)) return value.flatMap(addressList);
  return String(value || "").split(",").map((item)=>item.trim()).filter(Boolean);
}

async function resendSend(payload){
  const key = requireEnv("RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch(e){ data = { raw: text }; }
  if(!res.ok){
    throw new Error((data && data.message) || (data && data.error) || text || `Resend send failed (${res.status})`);
  }
  return data;
}

exports.handler = async (event) => {
  try{
    if(event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
    const auth = await verifyAuth(event);
    const body = parseJson(event);
    const toList = addressList(body.to);
    const ccList = addressList(body.cc);
    const bccList = addressList(body.bcc);
    const subject = String(body.subject || "").trim();
    const htmlBody = String(body.html || "");
    const message = String(body.message || body.text || stripHtml(htmlBody) || "");
    const requestedFrom = String(body.from_alias || body.from || "").trim().toLowerCase();
    const replyMessageId = String(body.reply_message_id || body.replyMessageId || "").trim();
    const replyThreadId = String(body.reply_thread_id || body.replyThreadId || body.thread_id || body.threadId || "").trim();

    if(!toList.length || toList.some((item)=>!item.includes("@"))) return json(400, { error: "Valid recipient email required." });
    if(!subject) return json(400, { error: "Subject required." });
    if(!message.trim() && !htmlBody.trim()) return json(400, { error: "Message body required." });

    const userRes = await query(
      `select u.id, u.handle, u.email, uk.version, uk.rsa_public_key_pem
       from users u
       left join user_keys uk on uk.user_id = u.id and uk.is_active = true
       where u.id = $1
       limit 1`,
      [auth.sub]
    );
    if(!userRes.rows.length) return json(401, { error: "Unauthorized" });
    const user = userRes.rows[0];

    const hosted = await getHostedMailbox(user.id).catch(() => null);
    if (!hosted) {
      return json(409, { error: "This SkyEmail account does not have a Citadel/SkyeNet mailbox route yet, so sending is blocked to prevent reply bounces. Open mailbox status or reprovision the mailbox to create the receiving route." });
    }
    const inboundDomain = process.env.INBOUND_DOMAIN || hosted.domain || requireEnv("INBOUND_DOMAIN");
    let fromEmail = hosted.mailbox_email || `${user.handle}@${inboundDomain}`;
    if(requestedFrom && hosted){
      const aliasRes = await query(
        `select alias_email, alias_type, provider_alias_id
           from mailbox_aliases
          where user_id=$1
            and mailbox_id=$2
            and lower(alias_email)=lower($3)
            and coalesce(status,'active')='active'
          limit 1`,
        [user.id, hosted.id, requestedFrom]
      ).catch(()=>({ rows: [] }));
      const allowedAlias = aliasRes.rows[0] || (String(hosted.mailbox_email || "").toLowerCase() === requestedFrom ? { alias_email: hosted.mailbox_email, alias_type: "primary", provider_alias_id: hosted.provider_account_id } : null);
      const providerBacked = !allowedAlias || allowedAlias.alias_type === "primary" || Boolean(allowedAlias.provider_alias_id);
      if(allowedAlias && !providerBacked){
        return json(409, { error: `The alias ${requestedFrom} is saved in SkyeEmail but is not sovereign-backed for inbound replies yet. Recreate it in Settings so Citadel confirms the receiving alias before sending.` });
      }
      if(allowedAlias) fromEmail = requestedFrom;
    }
    const replyToEmail = fromEmail;
    const fromName = process.env.MAIL_FROM_FALLBACK_NAME ? `${process.env.MAIL_FROM_FALLBACK_NAME} • ${user.handle}` : user.handle;
    const html = htmlBody || `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6">${escapeHtml(message)}</div>`;

    let sendProvider = "resend";
    let sendRes = null;
    if (hosted?.provider === "zoho" && zohoApiConfigured()) {
      sendProvider = "zoho";
      sendRes = await zohoSendMail({
        accountId: hosted.provider_account_id,
        fromAddress: fromEmail,
        to: toList,
        cc: ccList,
        bcc: bccList,
        replyTo: replyToEmail,
        subject,
        html,
        text: message,
        replyMessageId,
        threadId: replyThreadId
      });
    } else {
      sendRes = await resendSend({
        from: `${fromName} <${fromEmail}>`,
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject,
        html,
        text: message,
        replyTo: replyToEmail,
        headers: replyMessageId ? { "In-Reply-To": replyMessageId, "References": replyThreadId || replyMessageId } : undefined
      });
    }
    const providerMessageId = sendRes && sendRes.id ? sendRes.id : null;

    let inserted = { rows: [{ id: null, created_at: null }] };
    if(user.rsa_public_key_pem && user.version){
      const enc = hybridEncryptNode(user.rsa_public_key_pem, {
        subject,
        message,
        direction: "sent",
        sent_via: sendProvider,
        from: fromEmail,
        reply_to: replyToEmail,
        to: toList,
        cc: ccList,
        bcc: bccList,
        reply_message_id: replyMessageId || null,
        reply_thread_id: replyThreadId || null,
        provider_message_id: providerMessageId,
        resend_id: sendProvider === "resend" ? providerMessageId : null
      });

      inserted = await query(
        `insert into messages(
           user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
           direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at
         )
         values($1,$2,$3,$4,$5,$6,$7,'sent',$8,$9,'sent',now())
         returning id, created_at`,
        [user.id, `To: ${toList.join(", ")}`, toList.join(", "), user.version, enc.encrypted_key_b64, enc.iv_b64, enc.ciphertext_b64, sendProvider, providerMessageId]
      );
    }

    await mirrorPlatformEvent({
      actor: user.email,
      org_id: auth.fs27_customer_id || null,
      ws_id: hosted?.id || inserted.rows[0].id || user.id,
      type: "skymail.mail.sent",
      meta: {
        from: fromEmail,
        reply_to: replyToEmail,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        provider: sendProvider,
        provider_message_id: providerMessageId,
        reply_message_id: replyMessageId || null,
        reply_thread_id: replyThreadId || null,
        stored_encrypted_copy: Boolean(inserted.rows[0].id)
      }
    }).catch(() => null);

    return json(200, {
      ok: true,
      resend_id: sendProvider === "resend" ? providerMessageId : null,
      zoho_id: sendProvider === "zoho" ? providerMessageId : null,
      provider: sendProvider,
      message_id: inserted.rows[0].id,
      from: fromEmail,
      reply_to: replyToEmail,
      to: toList,
      cc: ccList,
      bcc: bccList,
      reply_message_id: replyMessageId || null,
      reply_thread_id: replyThreadId || null,
      stored_encrypted_copy: Boolean(inserted.rows[0].id)
    });
  }catch(err){
    const status = err.statusCode || 500;
    return json(status, { error: err.message || "Server error" });
  }
};
