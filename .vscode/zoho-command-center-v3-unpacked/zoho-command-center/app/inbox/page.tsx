import { formatDate, getAccountId, getFolders, getMessageContent, getMessages, searchMessages, getFolderLabel } from "@/lib/zoho";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InboxPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const folderId = first(params.folderId);
  const messageId = first(params.messageId);
  const q = first(params.q);

  try {
    const accountId = await getAccountId();
    const folders = await getFolders(accountId);
    const activeFolderId = folderId || String(folders[0]?.folderId || "");
    const messages = q ? await searchMessages(q, { accountId, limit: 50 }) : await getMessages({ accountId, folderId: activeFolderId, limit: 50 });
    const selected = messageId ? messages.find((m) => String(m.messageId) === String(messageId)) : messages[0];
    const selectedFolderId = String(selected?.folderId || activeFolderId);
    const content = selected ? await getMessageContent(accountId, selectedFolderId, String(selected.messageId)) : null;

    return (
      <>
        <section className="header">
          <div>
            <h1 className="h1">Inbox</h1>
            <p className="sub">Real message list, search, folders, and message reader powered by Zoho Mail API.</p>
          </div>
          <a className="button" href="/compose">Compose</a>
        </section>

        <form method="get" style={{ marginBottom: 16 }}>
          <input name="q" placeholder="Search Zoho Mail, e.g. newMails or from:client@example.com" defaultValue={q || ""} />
        </form>

        <section className="grid cols-2">
          <div className="card">
            <div className="label">Folders</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 18px" }}>
              {folders.slice(0, 16).map((folder) => (
                <a className="button small" href={`/inbox?folderId=${folder.folderId}`} key={String(folder.folderId)}>{getFolderLabel(folder)}</a>
              ))}
            </div>
            <div className="label">Messages</div>
            <div style={{ marginTop: 12 }}>
              {messages.map((message) => (
                <a className="email-row" href={`/inbox?folderId=${message.folderId || activeFolderId}&messageId=${message.messageId}${q ? `&q=${encodeURIComponent(q)}` : ""}`} key={`${message.folderId}-${message.messageId}`}>
                  <div className="row-top"><span className="subject">{message.subject || "No subject"}</span><span className="muted small">{formatDate(message.receivedtime || message.sentDateInGMT)}</span></div>
                  <div className="muted small">{message.sender || message.fromAddress}</div>
                  <div className="small">{message.summary}</div>
                </a>
              ))}
            </div>
          </div>

          <article className="card">
            {selected ? (
              <>
                <div className="label">Reading</div>
                <h2>{selected.subject || "No subject"}</h2>
                <p className="muted">From {selected.sender || selected.fromAddress} • {formatDate(selected.receivedtime || selected.sentDateInGMT)}</p>
                <div style={{ borderTop: "1px solid var(--line)", marginTop: 16, paddingTop: 16 }}>
                  <MessageBody content={content} />
                </div>
              </>
            ) : (
              <p className="muted">No messages found.</p>
            )}
          </article>
        </section>
      </>
    );
  } catch (error) {
    return <div className="card alert"><h1>Inbox failed to load.</h1><p>{error instanceof Error ? error.message : "Unknown error"}</p></div>;
  }
}

function MessageBody({ content }: { content: any }) {
  const html = content?.content || content?.messageContent || content?.html || content?.body;
  if (typeof html === "string" && html.trim().startsWith("<")) {
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{typeof html === "string" ? html : JSON.stringify(content, null, 2)}</pre>;
}
