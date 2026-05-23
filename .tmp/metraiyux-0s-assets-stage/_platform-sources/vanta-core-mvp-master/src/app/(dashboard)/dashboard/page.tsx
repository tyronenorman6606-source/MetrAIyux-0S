import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { db } from '@/db';
import { leads, messages } from '@/db/schema/schema';
import { count, desc } from 'drizzle-orm';

export default async function DashboardPage() {
  // Fetch real stats
  const [leadCount] = await db.select({ value: count() }).from(leads);

  // Fetch recent activity
  const recentMessages = await db.query.messages.findMany({
    with: {
        conversation: {
            with: {
                contact: true
            }
        }
    },
    orderBy: [desc(messages.createdAt)],
    limit: 5,
  });

  const stats = [
    { title: 'Leads Captured', value: leadCount.value.toString(), change: '+12%', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { title: 'Revenue Protected', value: '$12,450', change: '+18%', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.407 2.651 1M12 8V7m0 8v1m4-11a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { title: 'Calls Answered', value: '432', change: '+5%', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { title: 'Appointments Booked', value: '56', change: '+24%', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-primary/10 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-500 mt-1 flex items-center">
                <span className="mr-1">↑</span> {stat.change} <span className="text-muted-foreground ml-1">since last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Activity Stream */}
        <Card className="lg:col-span-2 border-primary/10 bg-card/30">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Live Activity Stream</CardTitle>
              <span className="text-xs text-primary animate-pulse font-mono tracking-widest">REAL-TIME DATA</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-primary/10 group">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary neon-glow" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Message from: <span className="text-primary font-bold">{(msg.conversation as any)?.contact?.name || 'Unknown'}</span></p>
                    <p className="text-xs text-muted-foreground">"{msg.content}"</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="mt-1 px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded uppercase font-bold border border-primary/20 group-hover:neon-border">
                        {msg.senderType}
                    </div>
                  </div>
                </div>
              ))}
              {recentMessages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground italic">
                    No recent activity.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lead Firewall Status */}
        <div className="space-y-8">
          <Card className="border-primary/10 bg-card/30">
            <CardHeader>
              <CardTitle className="text-xl">Lead Firewall</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">Noise Filtered</p>
                  <p className="text-4xl font-bold">84%</p>
                </div>
                <div className="h-16 w-32 flex items-end gap-1">
                  {[4, 7, 5, 9, 6, 8, 10, 7].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary/20 border-t border-primary rounded-t-sm" style={{ height: `${h * 10}%` }} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Spam Blocked</span>
                  <span className="font-mono">1,204</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[75%] neon-glow" />
                </div>
                <div className="flex justify-between text-xs">
                  <span>Vendors Deflected</span>
                  <span className="font-mono">43</span>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 w-[40%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
