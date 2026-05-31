const { json, verifyAuth } = require("./_utils");

function configured(name){
  return !!String(process.env[name] || "").trim();
}

function configuredAny(...names){
  return names.some((name) => configured(name));
}

function zohoConfigured(){
  return configuredAny("ZOHO_CLIENT_ID", "Client_ID", "ZOHO_MAIL_CLIENT_ID")
    && configuredAny("ZOHO_CLIENT_SECRET", "Client_Secret", "ZOHO_MAIL_CLIENT_SECRET")
    && configuredAny("ZOHO_REFRESH_TOKEN", "Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN");
}

exports.handler = async (event) => {
  try{
    await verifyAuth(event);
    const base = String(process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    const resendEndpoint = base ? `${base}/.netlify/functions/inbound-resend` : "/.netlify/functions/inbound-resend";
    return json(200, {
      ok: true,
      telemetry_source: "database-backed message_delivery_events plus provider webhook audit tables",
      configured: {
        database: configured("DATABASE_URL"),
        provider_api: Boolean(zohoConfigured() || configured("RESEND_API_KEY")),
        zoho_api: zohoConfigured(),
        resend_api_key: configured("RESEND_API_KEY"),
        resend_webhook_secret: configured("RESEND_WEBHOOK_SECRET"),
        inbound_domain: configured("INBOUND_DOMAIN"),
      },
      inbound_domain: process.env.INBOUND_DOMAIN || null,
      endpoint: resendEndpoint,
      endpoints: {
        delivery_events: base ? `${base}/api/resend-events-list` : "/api/resend-events-list",
        resend_webhook: resendEndpoint,
        zoho_webhook: base ? `${base}/api/zoho-webhook` : "/api/zoho-webhook",
        zoho_webhook_events: base ? `${base}/api/zoho-webhook-events` : "/api/zoho-webhook-events",
      },
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
