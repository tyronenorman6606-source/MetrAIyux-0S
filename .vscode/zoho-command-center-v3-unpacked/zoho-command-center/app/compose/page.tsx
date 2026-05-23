import { redirect } from "next/navigation";
import { getActiveAccount, sendMail } from "@/lib/zoho";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

async function sendAction(formData: FormData) {
  "use server";
  const contentType = String(formData.get("contentType") || "html") as "html" | "plaintext";
  await sendMail({
    fromAddress: String(formData.get("fromAddress") || process.env.ZOHO_DEFAULT_FROM || ""),
    toAddress: String(formData.get("toAddress") || ""),
    ccAddress: String(formData.get("ccAddress") || ""),
    bccAddress: String(formData.get("bccAddress") || ""),
    subject: String(formData.get("subject") || ""),
    content: String(formData.get("content") || ""),
    mailFormat: contentType
  });
  redirect("/compose?sent=1");
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ComposePage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const sent = first(params.sent) === "1";
  let sendFrom = [process.env.ZOHO_DEFAULT_FROM].filter(Boolean) as string[];

  try {
    const account = await getActiveAccount();
    const apiSenders = account.sendMailDetails?.filter((s) => s.status !== false && s.fromAddress).map((s) => s.fromAddress as string) || [];
    sendFrom = Array.from(new Set([...sendFrom, ...apiSenders]));
  } catch {}

  return (
    <>
      <section className="header">
        <div>
          <h1 className="h1">Compose</h1>
          <p className="sub">This form sends through the Zoho Mail API using the authenticated mailbox and the selected send-from identity.</p>
        </div>
      </section>

      {sent && <div className="card success" style={{ marginBottom: 16 }}>Email sent successfully through Zoho.</div>}

      <section className="card">
        <form action={sendAction}>
          <label>
            <span className="label">From</span>
            <select name="fromAddress" defaultValue={process.env.ZOHO_DEFAULT_FROM || sendFrom[0] || ""} required>
              {sendFrom.map((sender) => <option value={sender} key={sender}>{sender}</option>)}
            </select>
          </label>
          <label>
            <span className="label">To</span>
            <input name="toAddress" placeholder="client@example.com" required />
          </label>
          <label>
            <span className="label">Cc</span>
            <input name="ccAddress" placeholder="optional" />
          </label>
          <label>
            <span className="label">Bcc</span>
            <input name="bccAddress" placeholder="optional" />
          </label>
          <label>
            <span className="label">Subject</span>
            <input name="subject" placeholder="Subject line" required />
          </label>
          <label>
            <span className="label">Format</span>
            <select name="contentType" defaultValue="html">
              <option value="html">HTML</option>
              <option value="plaintext">Plain text</option>
            </select>
          </label>
          <label>
            <span className="label">Message</span>
            <textarea name="content" placeholder="Write the email here. HTML is supported when format is HTML." required />
          </label>
          <button type="submit">Send through Zoho</button>
        </form>
      </section>
    </>
  );
}
