const { Webhook } = require("svix");
const { query } = require("./_db");
const { json, hybridEncryptNode, hybridEncryptBytesNode, requireEnv } = require("./_utils");
const { findMailboxByAddress } = require("./_mailbox-provider");

const DELIVERY_STATUS = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.suppressed": "suppressed",
  "email.received": "received",
};

function extractAddress(s){
  const m = String(s || "").match(/<([^>]+)>/);
  return (m ? m[1] : String(s || "")).trim().toLowerCase();
}

function handleFromAddress(addr){
  const email = extractAddress(addr);
  const local = email.split("@")[0] || "";
  return local.split("+")[0].trim().toLowerCase();
}

function getHeader(headers, name){
  const wanted = String(name || "").toLowerCase();
  for(const [key, value] of Object.entries(headers || {})){
    if(String(key).toLowerCase() === wanted) return String(value || "");
  }
  return "";
}

function toIsoOrNull(value){
  if(!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function eventCreatedAt(payload){
  return toIsoOrNull(payload?.data?.created_at || payload?.created_at);
}

async function resendGet(path){
  const key = requireEnv("RESEND_API_KEY");
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { "Authorization": `Bearer ${key}` }
  });
  const text = await res.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch(e){ data = { raw: text }; }
  if(!res.ok) throw new Error((data && data.message) || (data && data.error) || text || `Mail lane GET failed (${res.status})`);
  return data;
}

function htmlToText(html){
  return String(html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function verifyWebhook(event){
  const secret = requireEnv("RESEND_WEBHOOK_SECRET");
  const wh = new Webhook(secret);
  const payload = event.body || "";
  const hdr = event.headers || {};
  const headers = {
    "svix-id": getHeader(hdr, "svix-id"),
    "svix-timestamp": getHeader(hdr, "svix-timestamp"),
    "svix-signature": getHeader(hdr, "svix-signature")
  };
  return wh.verify(payload, headers);
}

async function insertWebhookAudit({ svixId, payload }){
  const data = payload?.data || {};
  const params = [
    svixId || null,
    String(payload?.type || "unknown"),
    data.email_id || data.id || null,
    JSON.stringify(payload || {}),
    eventCreatedAt(payload),
  ];

  if(svixId){
    const inserted = await query(
      `insert into resend_webhook_events (svix_id, event_type, resend_email_id, payload_json, event_created_at)
       values ($1,$2,$3,$4::jsonb,$5)
       on conflict (svix_id) do nothing
       returning id`,
      params
    );
    if(!inserted.rows.length) return { duplicate: true, id: null };
    return { duplicate: false, id: inserted.rows[0].id };
  }

  const inserted = await query(
    `insert into resend_webhook_events (svix_id, event_type, resend_email_id, payload_json, event_created_at)
     values ($1,$2,$3,$4::jsonb,$5)
     returning id`,
    params
  );
  return { duplicate: false, id: inserted.rows[0].id };
}

async function updateWebhookAudit(id, patch){
  if(!id) return;
  await query(
    `update resend_webhook_events
     set processing_status=$2,
         error=$3,
         related_user_id=coalesce($4, related_user_id),
         related_message_id=coalesce($5, related_message_id),
         processed_at=now()
     where id=$1`,
    [
      id,
      patch.processing_status || "processed",
      patch.error || null,
      patch.related_user_id || null,
      patch.related_message_id || null,
    ]
  );
}

function recipientList(data){
  const raw = Array.isArray(data?.to) ? data.to : (data?.to ? [data.to] : []);
  return raw.map((item)=>extractAddress(item) || String(item || "").trim()).filter(Boolean);
}

async function recordDeliveryEvent({ payload, svixId }){
  const data = payload?.data || {};
  const eventType = String(payload?.type || "");
  const providerMessageId = String(data.email_id || data.id || "").trim();
  const deliveryStatus = DELIVERY_STATUS[eventType] || eventType.replace(/^email\./, "") || "event";

  if(!providerMessageId){
    return { ignored: true, reason: "missing_provider_message_id" };
  }

  const messageRes = await query(
    `select id, user_id
     from messages
     where delivery_provider='resend' and provider_message_id=$1
     order by created_at desc
     limit 1`,
    [providerMessageId]
  );
  const message = messageRes.rows[0] || null;
  const recipients = recipientList(data);
  const eventAt = eventCreatedAt(payload);
  const rows = recipients.length ? recipients : [null];
  const created = [];

  for(const recipient of rows){
    const inserted = await query(
      `insert into message_delivery_events (
         user_id, message_id, provider, provider_message_id, event_type, delivery_status,
         recipient_email, from_email, subject, svix_id, payload_json, event_created_at
       )
       values ($1,$2,'resend',$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       on conflict (svix_id) do nothing
       returning id`,
      [
        message?.user_id || null,
        message?.id || null,
        providerMessageId,
        eventType,
        deliveryStatus,
        recipient,
        data.from ? extractAddress(data.from) || String(data.from) : null,
        data.subject || null,
        svixId || null,
        JSON.stringify(payload || {}),
        eventAt,
      ]
    );
    if(inserted.rows[0]?.id) created.push(inserted.rows[0].id);
  }

  if(message){
    await query(
      `update messages
       set delivery_status=$2,
           last_delivery_event_at=coalesce($3, now())
       where id=$1`,
      [message.id, deliveryStatus, eventAt]
    );
  }

  return {
    provider_message_id: providerMessageId,
    message_id: message?.id || null,
    user_id: message?.user_id || null,
    delivery_status: deliveryStatus,
    event_ids: created,
  };
}

async function importReceivedEmail(payload){
  const emailId = payload?.data && payload.data.email_id;
  if(!emailId) return { ignored: true, reason: "missing_email_id" };

  const received = await resendGet(`/emails/receiving/${encodeURIComponent(emailId)}`);
  const providerMessageId = received.id || emailId;
  const recipients = Array.isArray(received.to) ? received.to : [];
  const recipientAddresses = Array.from(new Set(recipients.map(extractAddress).filter(Boolean)));
  if(!recipientAddresses.length) return { ignored: true, reason: "no_recipient_addresses" };

  const created = [];
  const seenRoutes = new Set();
  for(const recipientAddress of recipientAddresses){
    let route = await findMailboxByAddress(recipientAddress);
    if(!route){
      const handle = handleFromAddress(recipientAddress);
      if(!handle) continue;
      const userRes = await query(
        `select u.id as user_id, u.handle, uk.version, uk.rsa_public_key_pem,
                $2::text as alias_email, 'legacy_handle' as alias_type
           from users u
           join user_keys uk on uk.user_id = u.id and uk.is_active = true
          where lower(u.handle) = $1
          limit 1`,
        [handle, recipientAddress]
      );
      route = userRes.rows[0] || null;
    }
    if(!route) continue;
    const routeKey = `${route.user_id}:${String(route.alias_email || recipientAddress).toLowerCase()}`;
    if(seenRoutes.has(routeKey)) continue;
    seenRoutes.add(routeKey);

    const bodyText = received.text || htmlToText(received.html || "");
    const payloadForVault = {
      subject: received.subject || "(no subject)",
      message: bodyText || "",
      direction: "inbound",
      source: "resend",
      from: received.from || "",
      to: received.to || [],
      delivered_to: recipientAddress,
      recipient_alias: route.alias_email || recipientAddress,
      route_type: route.alias_type || "unknown",
      mailbox_email: route.mailbox_email || null,
      cc: received.cc || [],
      bcc: received.bcc || [],
      reply_to: received.reply_to || [],
      headers: received.headers || {},
      resend_email_id: providerMessageId,
      raw: received.raw || null
    };
    const enc = hybridEncryptNode(route.rsa_public_key_pem, payloadForVault);
    const inserted = await query(
      `insert into messages(
         user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
         direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at,
         recipient_alias, delivered_to
       )
       values($1,$2,$3,$4,$5,$6,$7,'inbound','resend',$8,'received',coalesce($9, now()),$10,$11)
       returning id`,
      [
        route.user_id,
        received.from || null,
        extractAddress(received.from || "") || null,
        route.version,
        enc.encrypted_key_b64,
        enc.iv_b64,
        enc.ciphertext_b64,
        providerMessageId,
        eventCreatedAt(payload),
        route.alias_email || recipientAddress,
        recipientAddress,
      ]
    );
    const messageId = inserted.rows[0].id;

    const attachments = Array.isArray(received.attachments) ? received.attachments : [];
    for(const attachment of attachments){
      try{
        const attMeta = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(attachment.id)}`);
        if(!attMeta || !attMeta.download_url) continue;
        const fileRes = await fetch(attMeta.download_url);
        if(!fileRes.ok) continue;
        const buf = Buffer.from(await fileRes.arrayBuffer());
        const encAtt = hybridEncryptBytesNode(route.rsa_public_key_pem, buf);
        await query(
          `insert into attachments(message_id, filename, mime_type, size_bytes, encrypted_key_b64, iv_b64, ciphertext)
           values($1,$2,$3,$4,$5,$6,$7)`,
          [messageId, attMeta.filename || attachment.filename || "attachment", attMeta.content_type || attachment.content_type || "application/octet-stream", Number(attMeta.size || buf.length || 0), encAtt.encrypted_key_b64, encAtt.iv_b64, encAtt.ciphertext]
        );
      }catch(e){
        // Do not fail the whole inbound email if one attachment fetch/storage fails.
      }
    }

    created.push({
      handle: route.handle,
      user_id: route.user_id,
      message_id: messageId,
      recipient_alias: route.alias_email || recipientAddress,
      delivered_to: recipientAddress
    });
  }

  if(!created.length) return { ignored: true, reason: "no_matching_users" };
  return { created, provider_message_id: providerMessageId };
}

exports.handler = async (event) => {
  let audit = null;
  try{
    if(event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

    const verified = await verifyWebhook(event);
    const svixId = getHeader(event.headers || {}, "svix-id");
    audit = await insertWebhookAudit({ svixId, payload: verified });
    if(audit.duplicate) return json(200, { ok: true, duplicate: true });

    const type = String(verified?.type || "");
    if(type === "email.received"){
      const inbound = await importReceivedEmail(verified);
      const delivery = await recordDeliveryEvent({ payload: verified, svixId });
      await updateWebhookAudit(audit.id, {
        processing_status: inbound.ignored ? "ignored" : "processed",
        related_user_id: inbound.created?.[0]?.user_id || delivery.user_id || null,
        related_message_id: inbound.created?.[0]?.message_id || delivery.message_id || null,
      });
      return json(200, { ok: true, inbound, delivery });
    }

    if(type.startsWith("email.")){
      const delivery = await recordDeliveryEvent({ payload: verified, svixId });
      await updateWebhookAudit(audit.id, {
        processing_status: delivery.ignored ? "ignored" : "processed",
        related_user_id: delivery.user_id || null,
        related_message_id: delivery.message_id || null,
      });
      return json(200, { ok: true, monitored: true, delivery });
    }

    await updateWebhookAudit(audit.id, { processing_status: "ignored" });
    return json(200, { ok: true, ignored: true, type });
  }catch(err){
    await updateWebhookAudit(audit?.id, {
      processing_status: "failed",
      error: err.message || "Server error",
    });
    const status = err.statusCode || 500;
    return json(status, { error: err.message || "Server error" });
  }
};
