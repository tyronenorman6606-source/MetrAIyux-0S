'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-widest text-[10px] uppercase ${className || ''}`}>{children}</span>
);

export function TradePipelineStats() {
  const deals = [
    { id: 'd1', client: 'Acme Corp', service: 'Growth Operator', value: 4200, stage: 'proposal', probability: 70 },
    { id: 'd2', client: 'Metro Legal', service: 'Case Intake Operator', value: 2800, stage: 'negotiation', probability: 85 },
    { id: 'd3', client: 'Sunset Spa', service: 'Client Booking Operator', value: 1500, stage: 'closed_won', probability: 100 },
    { id: 'd4', client: 'Atlas Delivery', service: 'Dispatch Operator', value: 5600, stage: 'discovery', probability: 40 },
    { id: 'd5', client: 'Iron Grill', service: 'Reservation Operator', value: 900, stage: 'proposal', probability: 60 },
  ];

  const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedForecast = deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);

  const stats = [
    { label: 'Total Pipeline', value: `$${totalPipeline.toLocaleString()}`, sub: '6 active deals' },
    { label: 'Weighted Forecast', value: `$${Math.round(weightedForecast).toLocaleString()}`, sub: '85% confidence' },
    { label: 'Avg Deal Size', value: `$${Math.round(totalPipeline / deals.length).toLocaleString()}`, sub: 'Last 30 days' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
            <CardContent className="p-6">
              <Mono className="text-muted-foreground block mb-2">{stat.label}</Mono>
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.sub}</div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

export function TradeConversionFunnel() {
  const funnel = [
    { stage: 'Inbound', count: 1240, color: 'bg-primary' },
    { stage: 'Qualified', count: 680, color: 'bg-primary/80' },
    { stage: 'Proposed', count: 320, color: 'bg-primary/60' },
    { stage: 'Negotiation', count: 145, color: 'bg-primary/40' },
    { stage: 'Closed Won', count: 89, color: 'bg-green-400' },
  ];

  return (
    <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <CardTitle className="text-lg">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {funnel.map((step, i) => (
          <motion.div
            key={step.stage}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            transition={{ delay: i * 0.15 }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground font-medium">{step.stage}</span>
              <Mono className="text-primary">{step.count}</Mono>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
              <motion.div
                className={`h-full rounded-full ${step.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${(step.count / funnel[0].count) * 100}%` }}
                transition={{ duration: 1, delay: i * 0.15 }}
              />
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TradeActiveDeals() {
  const deals = [
    { id: 'd1', client: 'Acme Corp', service: 'Growth Operator', value: 4200, stage: 'proposal', probability: 70 },
    { id: 'd2', client: 'Metro Legal', service: 'Case Intake Operator', value: 2800, stage: 'negotiation', probability: 85 },
    { id: 'd3', client: 'Sunset Spa', service: 'Client Booking Operator', value: 1500, stage: 'closed_won', probability: 100 },
    { id: 'd4', client: 'Atlas Delivery', service: 'Dispatch Operator', value: 5600, stage: 'discovery', probability: 40 },
    { id: 'd5', client: 'Iron Grill', service: 'Reservation Operator', value: 900, stage: 'proposal', probability: 60 },
  ];

  const [animatedValues, setAnimatedValues] = useState<number[]>(deals.map(() => 0));

  useEffect(() => {
    const timers = deals.map((d, i) =>
      setTimeout(() => {
        setAnimatedValues((prev) => {
          const next = [...prev];
          next[i] = d.value;
          return next;
        });
      }, i * 200 + 300)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Card className="border-primary/10 bg-card/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <CardTitle className="text-lg">Active Deals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deals.map((deal, i) => (
          <motion.div
            key={deal.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-secondary/20 hover:border-primary/20 transition-colors"
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold">{deal.client}</div>
              <div className="text-xs text-muted-foreground">{deal.service}</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-lg font-bold text-primary">
                ${animatedValues[i].toLocaleString()}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Mono
                  className={`
                    ${deal.stage === 'closed_won' ? 'text-green-400' : deal.stage === 'negotiation' ? 'text-amber-400' : 'text-primary'}
                  `}
                >
                  {deal.probability}%
                </Mono>
                <div className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider border-primary/30 bg-primary/10 text-primary">
                  {deal.stage.replace('_', ' ')}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
