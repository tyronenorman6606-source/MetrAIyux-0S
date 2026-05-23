'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PulseStatMonitors,
  PulseAlertFeed,
  PulseOperatorLoad,
  PulseSystemHealth,
} from '@/components/dashboard/pulse-visuals';

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-widest text-[10px] uppercase ${className || ''}`}>{children}</span>
);

export default function PulseWarRoomPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pulse War Room</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest">
            Real-Time Operational Command
          </p>
        </div>
        <div className="text-right">
          <Mono className="text-primary text-lg">{now.toLocaleTimeString([], { hour12: false })}</Mono>
          <div className="text-xs text-muted-foreground">{now.toLocaleDateString()}</div>
        </div>
      </div>

      {/* Stat Monitors */}
      <PulseStatMonitors />

      {/* Alert Feed */}
      <PulseAlertFeed />

      {/* Bottom Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PulseOperatorLoad />
        <PulseSystemHealth />
      </div>
    </div>
  );
}
