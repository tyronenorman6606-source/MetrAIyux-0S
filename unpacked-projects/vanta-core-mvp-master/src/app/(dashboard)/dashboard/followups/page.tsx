import React from 'react';
import { db } from '@/db';
import { followupEvents, followupSequences, leads, contacts } from '@/db/schema/schema';
import { desc, eq, and } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function FollowupsPage() {
  const events = await db.query.followupEvents.findMany({
    with: {
      sequence: true,
      lead: {
        with: {
          contact: true
        }
      }
    },
    orderBy: [desc(followupEvents.scheduledAt)],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Follow-up Autopilot</h1>
          <p className="text-muted-foreground mt-2">Autonomous sequences recovering missed opportunities and nurturing leads.</p>
        </div>
        <div className="space-x-4">
          <Button variant="outline">Sequence Templates</Button>
          <Button className="neon-glow">Global Settings</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Active Sequences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Executed (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
          </CardContent>
        </Card>
        <Card className="border-primary/10 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recovery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">22%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardHeader>
          <CardTitle>Upcoming & Recent Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Lead</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Sequence</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Executed</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{(event as any).lead?.contact?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{(event as any).lead?.contact?.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">{(event as any).sequence?.name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        event.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 
                        event.status === 'executed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {new Date(event.scheduledAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {event.executedAt ? new Date(event.executedAt).toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">Pause</Button>
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                      No follow-up events scheduled yet.
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
