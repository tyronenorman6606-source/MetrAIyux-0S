const { json } = require("./_utils");
const { configuredDomains, providerConfigured } = require("./_mailbox-provider");
const { fs27Origin, mirrorSecret } = require("./_skygate");

exports.handler = async (event) => {
  if (String(event.httpMethod || "GET").toUpperCase() !== "GET") {
    return json(405, { error: "Method not allowed" });
  }
  const domains = configuredDomains();
  const provider = providerConfigured();
  return json(200, {
    ok: true,
    domains,
    primary_domain: domains[0] || null,
    provisioning_configured: provider.configured,
    provider: provider.provider,
    provider_configured: provider,
    fs27_configured: Boolean(fs27Origin()),
    fs27_event_mirror_configured: Boolean(fs27Origin() && mirrorSecret()),
  });
};
