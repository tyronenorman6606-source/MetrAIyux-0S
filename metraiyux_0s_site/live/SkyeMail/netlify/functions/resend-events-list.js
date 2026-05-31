const { query } = require("./_db");
const { json, verifyAuth } = require("./_utils");

function toInt(value, fallback, max){
  const n = Number.parseInt(String(value || ""), 10);
  if(!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

exports.handler = async (event) => {
  try{
    const auth = await verifyAuth(event);
    const limit = toInt(event.queryStringParameters?.limit, 100, 250);

    const [summaryRes, eventsRes, webhookRes] = await Promise.all([
      query(
        `select
           count(*)::int as total_events,
           count(*) filter (where delivery_status='sent')::int as sent,
           count(*) filter (where delivery_status='delivered')::int as delivered,
           count(*) filter (where delivery_status='opened')::int as opened,
           count(*) filter (where delivery_status='clicked')::int as clicked,
           count(*) filter (where delivery_status='delayed')::int as delayed,
           count(*) filter (where delivery_status='bounced')::int as bounced,
           count(*) filter (where delivery_status='failed')::int as failed,
           count(*) filter (where delivery_status='complained')::int as complained,
           count(*) filter (where delivery_status='received')::int as received
         from message_delivery_events
         where user_id=$1 and created_at >= now() - interval '30 days'`,
        [auth.sub]
      ),
      query(
        `select
           id, provider, event_type, delivery_status, provider_message_id, recipient_email,
           from_email, subject, svix_id, event_created_at, created_at
         from message_delivery_events
         where user_id=$1
         order by coalesce(event_created_at, created_at) desc
         limit $2`,
        [auth.sub, limit]
      ),
      query(
        `select
           id, svix_id, event_type, resend_email_id, processing_status, error,
           received_at, event_created_at, processed_at
         from resend_webhook_events
         where related_user_id=$1
         order by received_at desc
         limit 50`,
        [auth.sub]
      ),
    ]);

    return json(200, {
      ok: true,
      window_days: 30,
      summary: summaryRes.rows[0] || {},
      events: eventsRes.rows,
      webhooks: webhookRes.rows,
    });
  }catch(err){
    const status = err.statusCode || 500;
    return json(status, { error: err.message || "Server error" });
  }
};
