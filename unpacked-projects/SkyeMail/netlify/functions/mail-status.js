const { json, verifyAuth } = require("./_utils");
const { loadGoogleMailbox, getWatchConfig } = require("./_gmail");
const { getHostedMailbox, providerConfigured, configuredDomains } = require("./_mailbox-provider");
const { fs27Origin, mirrorSecret } = require("./_skygate");

exports.handler = async (event) => {
  try {
    if (String(event.httpMethod || "GET").toUpperCase() !== "GET") {
      return json(405, { error: "Method not allowed" });
    }
    const auth = verifyAuth(event);
    const [gmail, hosted] = await Promise.all([
      loadGoogleMailbox(auth.sub).catch(() => null),
      getHostedMailbox(auth.sub).catch(() => null)
    ]);
    const provider = providerConfigured();

    return json(200, {
      ok: true,
      connected: Boolean(hosted || gmail),
      mode: hosted ? "hosted-provider" : (gmail ? "gmail-backed" : "not-connected"),
      mailbox: hosted ? {
        id: hosted.id,
        mailbox_email: hosted.mailbox_email,
        local_part: hosted.local_part,
        domain: hosted.domain,
        provider: hosted.provider,
        provider_account_id: hosted.provider_account_id,
        status: hosted.status,
        provisioning_status: hosted.provisioning_status,
        imap_host: hosted.imap_host,
        smtp_host: hosted.smtp_host,
        jmap_url: hosted.jmap_url,
        created_at: hosted.created_at,
        updated_at: hosted.updated_at,
        provisioned_at: hosted.provisioned_at,
        last_error: hosted.last_error,
      } : null,
      gmail: gmail ? {
        connected: true,
        google_email: gmail.google_email,
        watch_status: gmail.watch_status,
        watch_expiration: gmail.watch_expiration,
        push_enabled: gmail.push_enabled,
      } : { connected: false },
      provisioning: {
        status: provider.configured ? "ready" : "missing-provider-env",
        provider: provider.provider,
        configured: provider.configured,
        domains: configuredDomains(),
        fs27_configured: Boolean(fs27Origin()),
        fs27_event_mirror_configured: Boolean(fs27Origin() && mirrorSecret()),
        gmail_watch_configured: Boolean(getWatchConfig()),
        error: provider.configured ? null : "Set hosted mailbox provider env before provisioning a real mailbox."
      }
    });
  } catch (err) {
    return json(err.statusCode || 500, { error: err.message || "Server error" });
  }
};
