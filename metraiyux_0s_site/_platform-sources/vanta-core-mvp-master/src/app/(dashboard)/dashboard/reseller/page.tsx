import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { db } from '@/db';
import { resellers, tenants } from '@/db/schema/schema';
import { eq, count } from 'drizzle-orm';
import { getResellerClients, getResellerUsageStats } from '@/lib/resellers';

export default async function AgencyDashboardPage() {
  // In a real app, get current reseller from user session
  const reseller = await db.query.resellers.findFirst();
  
  if (!reseller) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-primary uppercase font-mono">Agency Account Not Found</h2>
        <p className="text-muted-foreground mt-2">Please contact Skyes Over London support.</p>
      </div>
    );
  }

  type ResellerClient = {
    id: string;
    name: string;
    slug: string;
    status: string;
    metrics: { leads: number };
  };

  const clients = await getResellerClients(reseller.id) as unknown as ResellerClient[];
  const usage = await getResellerUsageStats(reseller.id);

  const stats = [
    { title: 'Total Clients', value: clients.length.toString() },
    { title: '30D Managed Leads', value: usage.totalLeads.toString() },
    { title: '30D Managed Calls', value: usage.totalCalls.toString() },
    { title: 'Agency Status', value: 'ACTIVE' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">Agency Command Center</h1>
          <p className="text-muted-foreground">Managing <span className="text-primary font-bold">{reseller.name}</span> portal.</p>
        </div>
        <button className="px-6 py-2 bg-primary text-background font-bold uppercase tracking-widest text-xs rounded hover:bg-primary/90 transition-all neon-glow">
          + Onboard New Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-primary/10 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle className="text-xl uppercase font-mono tracking-widest">Client Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary/10 text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-4 px-2">Client Name</th>
                  <th className="py-4 px-2">Slug</th>
                  <th className="py-4 px-2">Total Leads</th>
                  <th className="py-4 px-2">Status</th>
                  <th className="py-4 px-2">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {clients.map(client => (
                  <tr key={client.id} className="border-b border-primary/5 hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-2 font-bold">{client.name}</td>
                    <td className="py-4 px-2 font-mono text-xs">{client.slug}</td>
                    <td className="py-4 px-2">{client.metrics.leads}</td>
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        client.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex gap-3">
                        <button className="text-primary hover:underline text-[10px] font-bold uppercase">
                          Login
                        </button>
                        <button className="text-muted-foreground hover:text-primary text-[10px] font-bold uppercase">
                          Export
                        </button>
                        <button className="text-muted-foreground hover:text-red-500 text-[10px] font-bold uppercase">
                          {client.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                      No clients found in portfolio.
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
