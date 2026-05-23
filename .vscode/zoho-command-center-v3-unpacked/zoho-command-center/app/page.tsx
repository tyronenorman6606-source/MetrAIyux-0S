import { formatDate, getActiveAccount, getFolderLabel, getFolders, getMessages } from "@/lib/zoho";
import { getDashboardStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dbStats = await getSafeDbStats();

  try {
    const account = await getActiveAccount();
    const accountId = String(account.accountId);
    const [folders, unreadMessages, recentMessages] = await Promise.all([
      getFolders(accountId),
      getMessages({ accountId, status: "unread", limit: 50 }),
      getMessages({ accountId, status: "all", limit: 8 })
    ]);

    const senders = new Set(recentMessages.map((m) => m.fromAddress || m.sender).filter(Boolean));
    const fromAddresses = account.sendMailDetails?.filter((s) => s.status !== false).map((s) => s.fromAddress).filter(Boolean) || [];

    return (
      <>
        <section className="header">
          <div>
            <h1 className="h1">Email service command center.</h1>
            <p className="sub">Zoho-backed inbox plus Neon-backed client onboarding, package tracking, mailbox inventory, and provisioning queue. No built-in auth; put your gate in front.</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a className="button" href="/onboard">Onboard</a>
            <a className="button" href="/compose">New email</a>
          </div>
        </section>

        {dbStats && (
          <section className="grid cols-3" style={{ marginBottom: 16 }}>
            <div className="card"><div className="label">Clients</div><div className="metric">{dbStats.clients}</div></div>
            <div className="card"><div className="label">Mailbox requests</div><div className="metric">{dbStats.mailboxes}</div></div>
            <div className="card"><div className="label">License pool</div><div className="metric">{dbStats.reserved_licenses || 0}/{dbStats.total_licenses || 131}</div><p className="muted small">Base pool cost ${(Number(dbStats.monthly_cost_cents || 0) / 100).toFixed(0)}/month</p></div>
          </section>
        )}

        <section className="grid cols-3">
          <div className="card"><div className="label">Unread</div><div className="metric">{unreadMessages.length}</div></div>
          <div className="card"><div className="label">Folders</div><div className="metric">{folders.length}</div></div>
          <div className="card"><div className="label">Recent senders</div><div className="metric">{senders.size}</div></div>
        </section>

        <section className="grid cols-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="label">Recent inbox activity</div>
            <div style={{ marginTop: 14 }}>
              {recentMessages.map((message) => (
                <a className="email-row" href={`/inbox?folderId=${message.folderId}&messageId=${message.messageId}`} key={`${message.folderId}-${message.messageId}`}>
                  <div className="row-top"><span className="subject">{message.subject || "No subject"}</span><span className="muted small">{formatDate(message.receivedtime || message.sentDateInGMT)}</span></div>
                  <div className="muted small">{message.sender || message.fromAddress}</div>
                  <div className="small">{message.summary}</div>
                </a>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="label">Folders</div>
            <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
              {folders.slice(0, 12).map((folder) => (
                <a className="email-row" href={`/inbox?folderId=${folder.folderId}`} key={String(folder.folderId)}>
                  <div className="row-top"><span>{getFolderLabel(folder)}</span><span className="muted small">{folder.unreadCount ?? folder.count ?? ""}</span></div>
                </a>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <div className="label">Available send-from addresses</div>
              <p className="muted small">{fromAddresses.length ? fromAddresses.join(" • ") : "No sendMailDetails returned for this account."}</p>
            </div>
          </div>
        </section>
      </>
    );
  } catch (error) {
    return <ConfigError error={error} dbStats={dbStats} />;
  }
}

async function getSafeDbStats() {
  try {
    return await getDashboardStats();
  } catch {
    return null;
  }
}

function ConfigError({ error, dbStats }: { error: unknown; dbStats: any }) {
  return (
    <>
      <div className="card alert">
        <h1>Zoho connection is not configured yet.</h1>
        <p>{error instanceof Error ? error.message : "Unknown connection error"}</p>
        <p className="muted">Set the variables from .env.example, then restart the Next.js server.</p>
      </div>
      {dbStats && <div className="card" style={{ marginTop: 16 }}><div className="label">Neon is connected</div><p>{dbStats.clients} clients • {dbStats.mailboxes} mailbox requests • {dbStats.queued_tasks} queued tasks</p></div>}
    </>
  );
}
