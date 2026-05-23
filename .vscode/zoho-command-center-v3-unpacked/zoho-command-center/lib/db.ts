import { neon } from "@neondatabase/serverless";

export type ServiceLane = "shared_skyemail" | "client_domain" | "bulk_hosted" | "child_org";

type NeonSql = ReturnType<typeof neon>;
let cachedSql: NeonSql | null = null;

function getSql(): NeonSql {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("Missing DATABASE_URL. Create a Neon project and add its pooled Postgres connection string.");
  if (!cachedSql) cachedSql = neon(value);
  return cachedSql;
}

export async function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  return (await getSql()(strings, ...values)) as any[];
}

export async function getPlans() {
  return sql`select * from service_plans where active = true order by setup_fee_cents asc, min_mailboxes asc`;
}

export async function getClients() {
  return sql`
    select
      c.*,
      count(distinct o.id)::int as order_count,
      count(distinct m.id)::int as mailbox_count
    from clients c
    left join email_service_orders o on o.client_id = c.id
    left join mailbox_requests m on m.client_id = c.id
    group by c.id
    order by c.created_at desc
    limit 100
  `;
}

export async function getDashboardStats() {
  const rows = await sql`
    select
      (select count(*)::int from clients) as clients,
      (select count(*)::int from email_service_orders) as orders,
      (select count(*)::int from mailbox_requests) as mailboxes,
      (select count(*)::int from provisioning_tasks where status = 'queued') as queued_tasks,
      (select total_licenses from mailbox_inventory where label = 'primary_zoho_131_pool') as total_licenses,
      (select reserved_licenses from mailbox_inventory where label = 'primary_zoho_131_pool') as reserved_licenses,
      (select monthly_cost_cents from mailbox_inventory where label = 'primary_zoho_131_pool') as monthly_cost_cents
  `;
  return rows[0] || null;
}

export async function createOnboarding(input: {
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  lane: ServiceLane;
  desiredDomain?: string;
  sharedDomainPrefix?: string;
  mailboxCount: number;
  mailboxNames: string[];
  notes?: string;
  externalOwnerId?: string;
}) {
  const lane = input.lane;
  const plans = await sql`select * from service_plans where lane = ${lane} and active = true order by min_mailboxes asc limit 1`;
  const plan = plans[0];
  if (!plan) throw new Error(`No active service plan for lane ${lane}`);

  const mailboxCount = normalizeMailboxCount(Number(input.mailboxCount || plan.min_mailboxes), Number(plan.min_mailboxes), Number(plan.mailbox_increment));
  const setupFeeCents = Number(plan.setup_fee_cents || 0);
  const domainName = normalizeDomainForLane(lane, input.desiredDomain, input.sharedDomainPrefix);

  const clients = await sql`
    insert into clients (external_owner_id, company_name, primary_contact_name, primary_contact_email, primary_contact_phone, notes)
    values (${input.externalOwnerId || null}, ${input.companyName}, ${input.contactName || null}, ${input.contactEmail || null}, ${input.contactPhone || null}, ${input.notes || null})
    returning *
  `;
  const client = clients[0];

  const orders = await sql`
    insert into email_service_orders (client_id, plan_id, lane, desired_domain, shared_domain_prefix, mailbox_count, setup_fee_cents, monthly_price_cents, onboarding_payload)
    values (${client.id}, ${plan.id}, ${lane}, ${input.desiredDomain || null}, ${input.sharedDomainPrefix || null}, ${mailboxCount}, ${setupFeeCents}, ${Number(plan.monthly_price_cents || 0)}, ${JSON.stringify(input)}::jsonb)
    returning *
  `;
  const order = orders[0];

  if (domainName) {
    await sql`
      insert into client_domains (client_id, order_id, domain_name, domain_mode)
      values (${client.id}, ${order.id}, ${domainName}, ${domainModeForLane(lane)})
      on conflict (client_id, domain_name) do nothing
    `;
  }

  const cleanedNames = buildMailboxNames(input.mailboxNames, mailboxCount);
  for (const localPart of cleanedNames) {
    await sql`
      insert into mailbox_requests (client_id, order_id, local_part, domain_name, display_name)
      values (${client.id}, ${order.id}, ${localPart}, ${domainName || "pending-domain.local"}, ${titleCase(localPart)})
      on conflict (address) do nothing
    `;
  }

  if (setupFeeCents > 0) {
    await sql`
      insert into billing_items (client_id, order_id, item_type, description, amount_cents)
      values (${client.id}, ${order.id}, 'setup_fee', ${plan.plan_name || 'Email setup fee'}, ${setupFeeCents})
    `;
  }

  await enqueueProvisioningTasks({ clientId: client.id, orderId: order.id, lane, domainName, mailboxCount });

  await sql`
    update mailbox_inventory
    set reserved_licenses = reserved_licenses + ${mailboxCount}, updated_at = now()
    where label = 'primary_zoho_131_pool'
  `;

  return { client, order, domainName, mailboxCount };
}

async function enqueueProvisioningTasks(args: { clientId: string; orderId: string; lane: ServiceLane; domainName?: string; mailboxCount: number }) {
  const tasks: Array<{ type: string; payload: Record<string, unknown>; priority: number }> = [];

  if (args.lane === "client_domain" || args.lane === "bulk_hosted" || args.lane === "child_org") {
    tasks.push({ type: "zoho.add_domain", priority: 10, payload: { domainName: args.domainName } });
    tasks.push({ type: "zoho.verify_domain", priority: 20, payload: { domainName: args.domainName } });
    tasks.push({ type: "zoho.enable_mail_hosting", priority: 30, payload: { domainName: args.domainName } });
    tasks.push({ type: "dns.verify_mx_spf_dkim", priority: 40, payload: { domainName: args.domainName } });
  }

  tasks.push({ type: "zoho.create_mailboxes", priority: 50, payload: { mailboxCount: args.mailboxCount } });

  for (const task of tasks) {
    await sql`
      insert into provisioning_tasks (client_id, order_id, task_type, priority, payload)
      values (${args.clientId}, ${args.orderId}, ${task.type}, ${task.priority}, ${JSON.stringify(task.payload)}::jsonb)
    `;
  }
}

function normalizeMailboxCount(count: number, min: number, increment: number) {
  if (count <= min) return min;
  const over = count - min;
  return min + Math.ceil(over / increment) * increment;
}

function normalizeDomainForLane(lane: ServiceLane, desiredDomain?: string, sharedDomainPrefix?: string) {
  const platformDomain = process.env.PLATFORM_EMAIL_DOMAIN || "solenterprises.org";
  if (lane === "shared_skyemail") {
    const prefix = slug(sharedDomainPrefix || "client");
    return `${prefix}.${platformDomain}`;
  }
  return desiredDomain?.trim().toLowerCase();
}

function domainModeForLane(lane: ServiceLane) {
  if (lane === "shared_skyemail") return "subdomain";
  if (lane === "child_org") return "child_org";
  return "owned_by_client";
}

function buildMailboxNames(names: string[], count: number) {
  const cleaned = names.map(slug).filter(Boolean);
  const defaults = ["admin", "support", "sales", "info", "billing", "operations", "hello", "team"];
  const output: string[] = [];
  for (const name of [...cleaned, ...defaults]) {
    if (!output.includes(name)) output.push(name);
    if (output.length >= count) break;
  }
  while (output.length < count) output.push(`inbox${output.length + 1}`);
  return output;
}

function slug(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string) {
  return value.replace(/[-._]+/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}
