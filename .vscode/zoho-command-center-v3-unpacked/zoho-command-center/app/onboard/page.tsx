import { redirect } from "next/navigation";
import { createOnboarding, getPlans, type ServiceLane } from "@/lib/db";

export const dynamic = "force-dynamic";

async function onboardAction(formData: FormData) {
  "use server";
  const mailboxNames = String(formData.get("mailboxNames") || "")
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const result = await createOnboarding({
    companyName: String(formData.get("companyName") || ""),
    contactName: String(formData.get("contactName") || ""),
    contactEmail: String(formData.get("contactEmail") || ""),
    contactPhone: String(formData.get("contactPhone") || ""),
    lane: String(formData.get("lane") || "shared_skyemail") as ServiceLane,
    desiredDomain: String(formData.get("desiredDomain") || ""),
    sharedDomainPrefix: String(formData.get("sharedDomainPrefix") || ""),
    mailboxCount: Number(formData.get("mailboxCount") || 1),
    mailboxNames,
    notes: String(formData.get("notes") || "")
  });

  redirect(`/clients?created=${result.client.id}`);
}

export default async function OnboardPage() {
  const plans = await getPlans();

  return (
    <>
      <section className="header">
        <div>
          <h1 className="h1">Email service onboarding.</h1>
          <p className="sub">Covers all three lanes: managed SkyEmail-style addresses, client-owned domains, and larger hosted inbox packages that start in five-seat blocks.</p>
        </div>
      </section>

      <section className="grid cols-3" style={{ marginBottom: 16 }}>
        {plans.map((plan: any) => (
          <div className="card" key={plan.id}>
            <div className="label">{plan.lane.replaceAll("_", " ")}</div>
            <h2>{plan.plan_name}</h2>
            <div className="metric">${(Number(plan.setup_fee_cents) / 100).toFixed(0)}</div>
            <p className="muted small">One-time setup • min {plan.min_mailboxes} • increments of {plan.mailbox_increment}</p>
            <p className="small">{plan.description}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <form action={onboardAction}>
          <label>
            <span className="label">Service lane</span>
            <select name="lane" defaultValue="shared_skyemail" required>
              <option value="shared_skyemail">Shared SkyEmail / platform domain</option>
              <option value="client_domain">Client-owned domain setup</option>
              <option value="bulk_hosted">Hosted inbox pack / 5-seat blocks</option>
              <option value="child_org">Child/customer organization</option>
            </select>
          </label>

          <div className="grid cols-2">
            <label>
              <span className="label">Company name</span>
              <input name="companyName" placeholder="Client company" required />
            </label>
            <label>
              <span className="label">Primary contact name</span>
              <input name="contactName" placeholder="Decision maker / admin" />
            </label>
          </div>

          <div className="grid cols-2">
            <label>
              <span className="label">Contact email</span>
              <input name="contactEmail" type="email" placeholder="client admin email" />
            </label>
            <label>
              <span className="label">Contact phone</span>
              <input name="contactPhone" placeholder="optional" />
            </label>
          </div>

          <div className="grid cols-2">
            <label>
              <span className="label">Shared domain prefix</span>
              <input name="sharedDomainPrefix" placeholder="clientname → clientname.your-platform-domain" />
            </label>
            <label>
              <span className="label">Client domain</span>
              <input name="desiredDomain" placeholder="clientcompany.com" />
            </label>
          </div>

          <div className="grid cols-2">
            <label>
              <span className="label">Mailbox count</span>
              <input name="mailboxCount" type="number" min="1" defaultValue="1" required />
            </label>
            <label>
              <span className="label">Desired inbox names</span>
              <textarea name="mailboxNames" placeholder="admin, support, sales, billing" />
            </label>
          </div>

          <label>
            <span className="label">Notes / special setup details</span>
            <textarea name="notes" placeholder="DNS access, requested groups, aliases, forwarding rules, migration notes" />
          </label>

          <button type="submit">Create client + provisioning queue</button>
        </form>
      </section>
    </>
  );
}
