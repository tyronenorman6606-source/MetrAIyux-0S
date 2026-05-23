'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-widest text-[10px] uppercase ${className || ''}`}>{children}</span>
);

export function PulseStatMonitors() {
  const stats = [
    { label: 'Live Leads', value: 142, change: '+12%', color: 'text-primary' },
    { label: 'Response Velocity', value: '1.2s', change: '-0.3s', color: 'text-green-400' },
    { label: 'Noise Blocked', value: 1204, change: '+8%', color: 'text-amber-400' },
    { label: 'Revenue at Risk', value: '$42K', change: '-5%', color: 'text-red-400' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
            <CardContent className="p-6">
              <Mono className="text-muted-foreground block mb-2">{stat.label}</Mono>
              <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs mt-1 text-green-400">{stat.change}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function PulseAlertFeed() {
  const alerts = [
    { id: 'a1', level: 'critical', message: '3 emergency leads unanswered > 5 min', time: '14:32' },
    { id: 'a2', level: 'warning', message: 'Webhook latency spike — Telnyx integration', time: '14:15' },
    { id: 'a3', level: 'info', message: 'VANTA13 model warmed up — v2.4.1', time: '13:58' },
    { id: 'a4', level: 'warning', message: 'Quote follow-up queue > 50 items', time: '13:42' },
  ];

  return (
    <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Live Alert Feed</CardTitle>
          <Mono className="text-primary animate-pulse">STREAMING</Mono>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-lg border bg-secondary/20 ${
              alert.level === 'critical'
                ? 'border-red-500/30'
                : alert.level === 'warning'
                ? 'border-amber-400/30'
                : 'border-primary/20'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                alert.level === 'critical'
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse'
                  : alert.level === 'warning'
                  ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                  : 'bg-primary shadow-[0_0_8px_var(--primary)]'
              }`}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">{alert.message}</div>
            </div>
            <Mono className="text-muted-foreground">{alert.time}</Mono>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PulseOperatorLoad() {
  const items = [
    { label: 'VANTA13 Inference', pct: 78 },
    { label: 'Webhook Queue', pct: 45 },
    { label: 'SMS Outbound', pct: 62 },
    { label: 'Email Pipeline', pct: 34 },
  ];

  return (
    <Card className="border-primary/10 bg-card/30">
      <CardHeader>
        <CardTitle className="text-lg">Operator Load</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{item.label}</span>
                <Mono className="text-primary">{item.pct}%</Mono>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${item.pct > 80 ? 'bg-red-400' : item.pct > 60 ? 'bg-amber-400' : 'bg-primary'}`}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ duration: 1.5 }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PulseSystemHealth() {
  const systems = [
    { label: 'Database', status: 'Healthy' },
    { label: 'AI Adapter', status: 'Healthy' },
    { label: 'Telnyx', status: 'Degraded' },
    { label: 'Stripe', status: 'Healthy' },
  ];

  return (
    <Card className="border-primary/10 bg-card/30">
      <CardHeader>
        <CardTitle className="text-lg">System Health</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {systems.map((sys) => (
          <div key={sys.label} className="p-3 rounded border border-border/60 bg-secondary/20">
            <Mono className="text-muted-foreground block mb-1">{sys.label}</Mono>
            <div className={`text-sm font-bold ${sys.status === 'Healthy' ? 'text-green-400' : 'text-amber-400'}`}>
              {sys.status}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
