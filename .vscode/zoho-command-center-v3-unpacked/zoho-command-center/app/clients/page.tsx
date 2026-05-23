import { getClients, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClientsPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const created = first(params.created);
  const clients = await getClients();
  const tasks = await sql`
    select p.*, c.company_name
    from provisioning_tasks p
    left join clients c on c.id = p.client_id
    order by p.created_at desc
    limit 50
  `;

  return (
    <>
      <section className="header">
        <div>
          <h1 className="h1">Clients and provisioning.</h1>
          <p className="sub">Your auth gate can own the user/session layer. This page is only the operational data layer: clients, orders, mailbox requests, fees, and Zoho provisioning tasks.</p>
        </div>
        <a className="button" href="/onboard">New onboarding</a>
      </section>

      {created && <div className="card success" style={{ marginBottom: 16 }}>Client created and provisioning tasks queued.</div>}

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="label">Client accounts</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Company</th><th>Status</th><th>Orders</th><th>Mailboxes</th><th>Contact</th><th>Created</th></tr>
            </thead>
            <tbody>
              {clients.map((client: any) => (
                <tr key={client.id}>
                  <td>{client.company_name}</td>
                  <td>{client.status}</td>
                  <td>{client.order_count}</td>
                  <td>{client.mailbox_count}</td>
                  <td>{client.primary_contact_email || "—"}</td>
                  <td>{new Date(client.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="label">Provisioning queue</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Client</th><th>Task</th><th>Status</th><th>Priority</th><th>Error</th><th>Created</th></tr>
            </thead>
            <tbody>
              {tasks.map((task: any) => (
                <tr key={task.id}>
                  <td>{task.company_name || "—"}</td>
                  <td>{task.task_type}</td>
                  <td>{task.status}</td>
                  <td>{task.priority}</td>
                  <td>{task.error || "—"}</td>
                  <td>{new Date(task.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
