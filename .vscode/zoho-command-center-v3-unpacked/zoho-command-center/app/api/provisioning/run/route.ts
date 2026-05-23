import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { addDomainToOrg, addUserToOrg, enableMailHosting, verifyDomain } from "@/lib/zoho-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.PROVISIONING_RUN_SECRET;
  if (secret && request.headers.get("x-provisioning-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized provisioning runner" }, { status: 401 });
  }

  try {
    const tasks = await sql`
      update provisioning_tasks
      set status = 'running', started_at = now()
      where id in (
        select id from provisioning_tasks
        where status = 'queued' and run_after <= now()
        order by priority asc, created_at asc
        limit 5
      )
      returning *
    `;

    const results = [];
    for (const task of tasks) {
      try {
        const result = await runTask(task);
        await sql`
          update provisioning_tasks
          set status = 'done', result = ${JSON.stringify(result)}::jsonb, finished_at = now()
          where id = ${task.id}
        `;
        results.push({ taskId: task.id, status: "done", result });
      } catch (error) {
        await sql`
          update provisioning_tasks
          set status = 'failed', error = ${error instanceof Error ? error.message : 'Unknown error'}, finished_at = now()
          where id = ${task.id}
        `;
        results.push({ taskId: task.id, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

async function runTask(task: any) {
  const payload = task.payload || {};
  if (task.task_type === "zoho.add_domain") return addDomainToOrg(payload.domainName);
  if (task.task_type === "zoho.verify_domain") return verifyDomain(payload.domainName);
  if (task.task_type === "zoho.enable_mail_hosting") return enableMailHosting(payload.domainName);
  if (task.task_type === "zoho.create_mailboxes") return createMailboxesForOrder(task.order_id);
  if (task.task_type === "dns.verify_mx_spf_dkim") return { manual: true, message: "DNS verification task queued. Run Zoho verification after client DNS records are live." };
  return { skipped: true, message: `No runner implemented for ${task.task_type}` };
}

async function createMailboxesForOrder(orderId: string) {
  const mailboxes = await sql`
    select * from mailbox_requests
    where order_id = ${orderId} and status in ('requested','queued')
    order by created_at asc
  `;

  const created = [];
  for (const mailbox of mailboxes) {
    const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 18) + "Aa1!";
    const result: any = await addUserToOrg({
      primaryEmailAddress: mailbox.address,
      password: tempPassword,
      displayName: mailbox.display_name || mailbox.local_part
    });
    await sql`
      update mailbox_requests
      set status = 'provisioned', temporary_password = ${tempPassword}, zoho_zuid = ${result?.data?.zuid || result?.data?.userId || null}, zoho_account_id = ${result?.data?.accountId || null}, updated_at = now()
      where id = ${mailbox.id}
    `;
    created.push({ address: mailbox.address, zoho: result?.data || result });
  }
  return { created };
}
