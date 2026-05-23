# SovereignDocs Production Cutover

1. Deploy public static pages.
2. Deploy optional API server or port the API contract to Cloudflare Workers.
3. Connect upstream auth. SovereignDocs should receive trusted identity from the gateway, not implement its own login.
4. Choose Neon or Cloudflare D1 and apply the schema in `database/`.
5. Replace local JSON persistence with the selected adapter.
6. Connect object storage for generated exports.
7. Connect Stripe checkout only after plan IDs and webhook fulfillment are configured.
8. Connect email delivery for document links, signing requests, and notices.
9. Connect external e-sign provider if true e-signature workflows are sold.
10. Run `npm run smoke:all` locally and deployed browser click proof on the live URL.

Static Netlify drop deployment cannot run the Node API. Use Git deployment with Functions, a separate Node host, or Cloudflare Workers for API mode.
