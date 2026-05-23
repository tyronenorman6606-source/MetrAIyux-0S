'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-widest text-[10px] uppercase ${className || ''}`}>{children}</span>
);

const leakages = [
  { id: 'l1', type: 'Missed Call', source: '+44 7700 900123', estimatedValue: 450, reason: 'No answer — off hours', time: '14:20', recovered: false },
  { id: 'l2', type: 'Quote Expired', source: 'quote #Q-9821', estimatedValue: 2800, reason: 'No follow-up sent', time: '13:45', recovered: true },
  { id: 'l3', type: 'No-Show', source: 'Booking #B-4412', estimatedValue: 600, reason: 'Reminder failed', time: '12:30', recovered: false },
  { id: 'l4', type: 'Abandoned Chat', source: 'Website widget', estimatedValue: 1200, reason: 'Bot handoff timeout', time: '11:10', recovered: true },
  { id: 'l5', type: 'Spam Filter False+', source: 'lead@acme.com', estimatedValue: 3500, reason: 'Misclassified as vendor', time: '10:05', recovered: false },
];

const summary = [
  { label: 'Total Leakage', value: '$21,150', color: 'text-red-400' },
  { label: 'Recovered', value: '$4,000', color: 'text-green-400' },
  { label: 'At Risk', value: '$17,150', color: 'text-amber-400' },
  { label: 'Recovery Rate', value: '18.9%', color: 'text-primary' },
];

export default function LeakageDashboardPage() {
  const [riskValues, setRiskValues] = useState<number[]>(leakages.map(() => 0));

  useEffect(() => {
    const timers = leakages.map((l, i) =>
      setTimeout(() => {
        setRiskValues((prev) => {
          const next = [...prev];
          next[i] = l.estimatedValue;
          return next;
        });
      }, i * 200 + 300)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Leakage</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest">
            Missed Opportunity Tracker
          </p>
        </div>
        <div className="px-3 py-1.5 rounded border border-red-400/30 bg-red-400/10 text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          ATTENTION REQUIRED
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((stat, i) => (
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
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Leakage Feed */}
      <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Recent Leakage Events</CardTitle>
            <Mono className="text-primary">LAST 24H</Mono>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {leakages.map((leak, i) => (
            <motion.div
              key={leak.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-lg border bg-secondary/20 transition-colors ${
                leak.recovered ? 'border-green-500/20' : 'border-red-500/20 hover:border-red-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    leak.recovered
                      ? 'bg-green-400 shadow-[0_0_8px_#4ade80]'
                      : 'bg-red-400 shadow-[0_0_8px_#ef4444] animate-pulse'
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold">{leak.type}</div>
                  <div className="text-xs text-muted-foreground">{leak.source}</div>
                  <div className="text-[10px] text-red-400 mt-0.5">{leak.reason}</div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className={`text-lg font-bold ${leak.recovered ? 'text-green-400' : 'text-red-400'}`}>
                  ${riskValues[i].toLocaleString()}
                </div>
                <Mono className="text-muted-foreground">{leak.time}</Mono>
                {leak.recovered && (
                  <div className="px-2 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase">
                    RECOVERED
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle className="text-lg">Leakage by Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Missed Calls', value: 8450, pct: 40 },
              { label: 'Abandoned Quotes', value: 6300, pct: 30 },
              { label: 'No-Shows', value: 3150, pct: 15 },
              { label: 'False Positive Filters', value: 3250, pct: 15 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <Mono className="text-primary">${item.value.toLocaleString()}</Mono>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-red-400"
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1.5 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-card/30">
          <CardHeader>
            <CardTitle className="text-lg">Recovery Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { action: 'Auto text-back sent', count: 45, impact: '$4,000' },
              { action: 'Follow-up email queued', count: 23, impact: '$2,800' },
              { action: 'Owner alert triggered', count: 12, impact: '$1,200' },
              { action: 'Quote extension issued', count: 8, impact: '$890' },
            ].map((item, i) => (
              <motion.div
                key={item.action}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-secondary/20"
              >
                <div>
                  <div className="text-sm font-medium">{item.action}</div>
                  <Mono className="text-muted-foreground">{item.count} executed</Mono>
                </div>
                <div className="text-sm font-bold text-green-400">{item.impact}</div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
