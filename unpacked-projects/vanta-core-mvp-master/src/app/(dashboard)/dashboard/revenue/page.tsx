import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getRevenueIntelligence } from '@/lib/revenue';
import { db } from '@/db';
import { checkFeatureAccess } from '@/lib/billing';
import Link from 'next/link';

export default async function RevenueIntelligencePage() {
  // In a real app, we'd get the tenantId from the user session/context
  const tenant = await db.query.tenants.findFirst();
  if (!tenant) return <div>No tenant found</div>;

  const hasAccess = await checkFeatureAccess(tenant.id, 'revenue-intelligence');

  if (!hasAccess) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold uppercase font-mono tracking-widest text-primary">Access Restricted</h1>
          <p className="text-muted-foreground max-w-md">
            Revenue Intelligence is available on the <span className="text-primary font-bold uppercase">Autonomous Growth Operator</span> plan.
          </p>
        </div>
        <Link href="/dashboard/billing" className="px-8 py-3 bg-primary text-background font-bold uppercase tracking-widest text-sm rounded hover:bg-primary/90 transition-colors neon-glow">
          Upgrade Now
        </Link>
      </div>
    );
  }

  const stats = await getRevenueIntelligence(tenant.id);

  const metrics = [
    { title: 'Leads Captured', value: stats.leadsCaptured, subtitle: 'Total prospects captured' },
    { title: 'Leads Booked', value: stats.leadsBooked, subtitle: 'Qualified leads converted' },
    { title: 'Conversion Rate', value: `${stats.conversionRate}%`, subtitle: 'Capture-to-booking efficiency' },
    { title: 'Revenue Protected', value: `$${stats.revenueProtected.toLocaleString()}`, subtitle: 'Estimated value defended' },
    { title: 'Calls Answered', value: stats.callsAnswered, subtitle: 'Total autonomous call handle' },
    { title: 'Cold Calls Blocked', value: stats.coldCallsBlocked, subtitle: 'Owner interruptions prevented' },
    { title: 'Missed Calls Recovered', value: stats.missedCallsRecovered, subtitle: 'Revenue saved from missed calls' },
    { title: 'Avg Response Time', value: stats.averageResponseTime, subtitle: 'AI response latency' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary uppercase font-mono tracking-widest">Revenue Intelligence</h1>
        <p className="text-muted-foreground">Autonomous performance and growth metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-primary/10 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                {metric.subtitle}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle className="text-xl uppercase font-mono tracking-widest">Growth Analytics</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground italic">
            Visual analytics engine initializing...
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle className="text-xl uppercase font-mono tracking-widest">Top Revenue Sources</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground italic">
            Source attribution engine initializing...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
