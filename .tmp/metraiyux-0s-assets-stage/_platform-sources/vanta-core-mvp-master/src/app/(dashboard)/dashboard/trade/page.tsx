'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TradePipelineStats,
  TradeConversionFunnel,
  TradeActiveDeals,
} from '@/components/dashboard/trade-visuals';

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`font-mono tracking-widest text-[10px] uppercase ${className || ''}`}>{children}</span>
);

export default function TradeDashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest">
            Revenue Pipeline & Deal Flow
          </p>
        </div>
        <div className="px-3 py-1.5 rounded border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
          LIVE PIPELINE
        </div>
      </div>

      {/* Top Stats */}
      <TradePipelineStats />

      {/* Funnel + Deals */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <TradeConversionFunnel />
        </div>
        <div className="xl:col-span-2">
          <TradeActiveDeals />
        </div>
      </div>
    </div>
  );
}
