const { json, verifyAuth } = require("./_utils");

function configured(name){
  return !!String(process.env[name] || "").trim();
}

exports.handler = async (event) => {
  try{
    verifyAuth(event);
    const base = String(process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    return json(200, {
      ok: true,
      configured: {
        database: configured("DATABASE_URL"),
        resend_api_key: configured("RESEND_API_KEY"),
        resend_webhook_secret: configured("RESEND_WEBHOOK_SECRET"),
        inbound_domain: configured("INBOUND_DOMAIN"),
      },
      inbound_domain: process.env.INBOUND_DOMAIN || null,
      endpoint: base ? `${base}/.netlify/functions/inbound-resend` : "/.netlify/functions/inbound-resend",
      events_to_enable: [
        "email.received",
        "email.scheduled",
        "email.sent",
        "email.delivered",
        "email.delivery_delayed",
        "email.bounced",
        "email.complained",
        "email.failed",
        "email.opened",
        "email.clicked",
        "email.suppressed",
      ],
    });
  }catch(err){
    const status = err.statusCode || 500;
    return json(status, { error: err.message || "Server error" });
  }
};
