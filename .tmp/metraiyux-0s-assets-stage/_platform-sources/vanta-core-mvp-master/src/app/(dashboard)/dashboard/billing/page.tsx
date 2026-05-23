import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { db } from '@/db';
import { billingSubscriptions, invoices, tenants, billingCustomers } from '@/db/schema/schema';
import { eq, desc } from 'drizzle-orm';
import { PLANS, PlanId } from '@/lib/billing';

export default async function BillingPage() {
  // Mock tenant for now
  const tenant = await db.query.tenants.findFirst();
  if (!tenant) return <div>No tenant found</div>;

  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenant.id))
    .limit(1);

  const tenantInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tenantId, tenant.id))
    .orderBy(desc(invoices.createdAt))
    .limit(10);

  const currentPlan = subscription ? PLANS[subscription.planId as PlanId] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan, payment methods, and invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <Card className="md:col-span-2 border-primary/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl uppercase font-mono tracking-widest">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-primary">{currentPlan?.name}</h2>
                    <p className="text-muted-foreground">${currentPlan?.price}/month</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${
                    subscription.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                  }`}>
                    {subscription.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Plan Features</h3>
                    <ul className="space-y-1">
                      {currentPlan?.features.slice(0, 6).map(f => (
                        <li key={f} className="text-xs flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-primary" />
                          {f.split('-').join(' ')}
                        </li>
                      ))}
                      {(currentPlan?.features.length || 0) > 6 && (
                        <li className="text-xs text-primary italic">+ more</li>
                      )}
                    </ul>
                  </div>
                  <div className="flex flex-col justify-end gap-3">
                    <button className="w-full py-2 bg-primary text-background font-bold uppercase tracking-widest text-xs rounded hover:bg-primary/90 transition-colors">
                      Upgrade Plan
                    </button>
                    <button className="w-full py-2 bg-secondary text-foreground font-bold uppercase tracking-widest text-xs rounded hover:bg-secondary/80 transition-colors">
                      Manage in Stripe
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <p className="text-muted-foreground italic">No active subscription found.</p>
                <button className="px-8 py-3 bg-primary text-background font-bold uppercase tracking-widest text-sm rounded hover:bg-primary/90 transition-colors neon-glow">
                  Select a Plan
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle className="text-lg uppercase font-mono tracking-widest">Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-widest">
                <span>AI Actions</span>
                <span>432 / 1000</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[43%] neon-glow" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs uppercase tracking-widest">
                <span>SMS Usage</span>
                <span>1,204 / Unlimited</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[75%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase font-mono tracking-widest">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary/10 text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-2">Date</th>
                  <th className="py-4 px-2">Invoice ID</th>
                  <th className="py-4 px-2">Amount</th>
                  <th className="py-4 px-2">Status</th>
                  <th className="py-4 px-2">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {tenantInvoices.map(inv => (
                  <tr key={inv.id} className="border-b border-primary/5 hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-2 font-mono text-xs">{inv.stripeInvoiceId}</td>
                    <td className="py-4 px-2 font-bold">${inv.amount}</td>
                    <td className="py-4 px-2">
                      <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[10px] font-bold uppercase">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-primary hover:underline cursor-pointer text-xs uppercase font-bold">
                      Download
                    </td>
                  </tr>
                ))}
                {tenantInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                      No invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
