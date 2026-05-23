'use client';

import React, { useEffect, useState } from 'react';

export function ActivityStream({ tenantId }: { tenantId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const res = await fetch(`/api/audit?tenantId=${tenantId}`);
        const data = await res.json();
        setActivities(data);
      } catch (err) {
        console.error('Failed to fetch activity:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivities();
    const interval = setInterval(fetchActivities, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [tenantId]);

  if (loading && activities.length === 0) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse font-mono tracking-widest uppercase text-xs">Accessing Action Ledger...</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((log) => (
        <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-primary/10 group">
          <div className={`mt-1 h-2 w-2 rounded-full ${
            log.action === 'intake_error' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-primary neon-glow'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {log.actor === 'ai' ? 'VANTA13' : 'System'}: 
              <span className="text-primary font-bold ml-1">
                {log.action.replace(/_/g, ' ').toUpperCase()}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              {log.entityType.toUpperCase()} {log.entityId?.slice(0, 8)}
            </p>
            {log.input?.content && (
              <p className="text-[10px] bg-secondary/80 p-1.5 rounded mt-2 border border-border/50 text-muted-foreground">
                "{log.input.content}"
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground font-mono uppercase">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
            </p>
            {log.result && (
              <div className="mt-1 px-2 py-0.5 bg-primary/20 text-primary text-[10px] rounded uppercase font-bold border border-primary/20 group-hover:neon-border">
                {JSON.parse(log.result).intent || 'PROCESSED'}
              </div>
            )}
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="py-12 text-center text-muted-foreground italic border border-dashed border-border rounded-lg">
          No system activity recorded yet.
        </div>
      )}
    </div>
  );
}
