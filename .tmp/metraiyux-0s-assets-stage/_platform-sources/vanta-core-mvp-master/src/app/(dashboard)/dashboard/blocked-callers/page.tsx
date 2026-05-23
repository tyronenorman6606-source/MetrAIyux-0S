import React from 'react';
import { db } from '@/db';
import { blockedCallers } from '@/db/schema/schema';
import { desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function BlockedCallersPage() {
  const callers = await db.query.blockedCallers.findMany({
    orderBy: [desc(blockedCallers.createdAt)],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Blocked Callers</h1>
          <p className="text-muted-foreground mt-2">Manage numbers that are prohibited from reaching your business.</p>
        </div>
        <Button>Add Number</Button>
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone Number</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Reason</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Blocked Since</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {callers.map((caller) => (
                  <tr key={caller.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold font-mono">{caller.phone}</div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{caller.reason || 'No reason provided'}</p>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(caller.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">Unblock</Button>
                    </td>
                  </tr>
                ))}
                {callers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-muted-foreground italic">
                      No blocked callers. Use the firewall to automatically block spam.
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
