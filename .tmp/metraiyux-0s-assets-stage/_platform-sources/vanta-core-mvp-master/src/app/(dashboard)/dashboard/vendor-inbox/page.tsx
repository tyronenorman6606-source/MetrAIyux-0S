import React from 'react';
import { db } from '@/db';
import { vendorIntake } from '@/db/schema/schema';
import { desc } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function VendorInboxPage() {
  const vendors = await db.query.vendorIntake.findMany({
    orderBy: [desc(vendorIntake.createdAt)],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary">Vendor Trap Inbox</h1>
        <p className="text-muted-foreground mt-2">Cold callers and vendor pitches are automatically routed here to protect your time.</p>
      </div>

      <Card className="border-primary/10 bg-card/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Source</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pitch Summary</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Detected At</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{vendor.name || 'Unknown Vendor'}</div>
                      <div className="text-xs text-muted-foreground">{vendor.phone || vendor.email}</div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm line-clamp-2">{vendor.pitch}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-secondary text-muted-foreground">
                        {vendor.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(vendor.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">Review</Button>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground italic">
                      The vendor trap is empty. Your time is currently well-protected.
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
