import React from 'react';
import { db } from '@/db';
import { leads, contacts, services } from '@/db/schema/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function LeadsPage() {
  const allLeads = await db.query.leads.findMany({
    with: {
      contact: true,
      service: true,
    },
    orderBy: [desc(leads.createdAt)],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Leads</h1>
          <p className="text-muted-foreground mt-2">Manage and track your inbound revenue opportunities.</p>
        </div>
        <Button>Export Leads</Button>
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Service</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Urgency</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Score</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Created</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{(lead as any).contact?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{(lead as any).contact?.phone || (lead as any).contact?.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{(lead as any).service?.name || 'General Inquiry'}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        lead.status === 'new' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        lead.urgency === 'emergency' ? 'bg-red-500/20 text-red-500 neon-border' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {lead.urgency}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${lead.qualityScore && lead.qualityScore > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                            style={{ width: `${lead.qualityScore || 0}%` }} 
                          />
                        </div>
                        <span className="text-xs font-mono">{lead.qualityScore || 0}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">View</Button>
                    </td>
                  </tr>
                ))}
                {allLeads.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground italic">
                      No leads captured yet. Initialize your intake channels to see data.
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
