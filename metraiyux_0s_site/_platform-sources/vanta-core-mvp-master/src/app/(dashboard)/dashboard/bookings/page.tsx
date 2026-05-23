import React from 'react';
import { db } from '@/db';
import { appointments, contacts, services } from '@/db/schema/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function BookingsPage() {
  const allAppointments = await db.query.appointments.findMany({
    with: {
      contact: true,
      service: true,
    },
    orderBy: [desc(appointments.startTime)],
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Bookings</h1>
          <p className="text-muted-foreground mt-2">Manage your scheduled appointments and service jobs.</p>
        </div>
        <Button className="neon-glow">Manual Booking</Button>
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
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scheduled Time</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Created</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allAppointments.map((appt) => (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{(appt as any).contact?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{(appt as any).contact?.phone || (appt as any).contact?.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{(appt as any).service?.name || 'Standard Service'}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        appt.status === 'confirmed' ? 'bg-green-500/20 text-green-500' : 
                        appt.status === 'cancelled' ? 'bg-red-500/20 text-red-500' : 'bg-secondary text-muted-foreground'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium">{new Date(appt.startTime).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(appt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(appt.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button variant="ghost" size="sm">Reschedule</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-500/10">Cancel</Button>
                    </td>
                  </tr>
                ))}
                {allAppointments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground italic">
                      No bookings found. Appointments will appear here once customers book via VANTA13.
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
