import React from 'react';
import {
  GlobalNodeGrid,
  NeuralResponseRadar,
  CampaignRescueStudio,
  PremiumQuoteArchitecture,
  ComplianceTrustLedger,
} from '@/components/dashboard/feature-pack-d-visuals';

export default function ExperienceHubPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Experience Hub</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest">
            Sovereign Tier Command Center
          </p>
        </div>
        <div className="px-3 py-1.5 rounded border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest animate-pulse">
          VANTA13 ACTIVE
        </div>
      </div>

      {/* Top Row: Node Grid + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <GlobalNodeGrid />
        <NeuralResponseRadar />
      </div>

      {/* Middle Row: Campaign Studio + Quote Architecture */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CampaignRescueStudio />
        <PremiumQuoteArchitecture />
      </div>

      {/* Bottom Row: Compliance Ledger */}
      <ComplianceTrustLedger />
    </div>
  );
}
