# Cloudflare Worker Deploy Checklist

✅ Static site package reviewed
☐ `npx wrangler dev` runs locally
☐ `/api/site-operator/status` returns JSON
☐ `/api/site-operator/route` routes a test message
☐ KV namespace created if durable event storage is needed
☐ Queue created if async task processing is needed
☐ Custom domain route configured if using a domain
☐ Human escalation rules reviewed
☐ Proof receipt saved after deployment
