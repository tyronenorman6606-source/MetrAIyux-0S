'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/* ─────────── Utilities ─────────── */
const cn = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

const Mono = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('font-mono tracking-widest text-[10px] uppercase', className)}>{children}</span>
);

const NeonBadge = ({ children, color = 'primary' }: { children: React.ReactNode; color?: 'primary' | 'destructive' | 'amber' }) => {
  const map = {
    primary: 'text-primary border-primary/30 bg-primary/10',
    destructive: 'text-red-400 border-red-400/30 bg-red-400/10',
    amber: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  };
  return (
    <div className={cn('px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider', map[color])}>
      {children}
    </div>
  );
};

/* ─────────── Global Node Grid ─────────── */
interface Node {
  id: string;
  name: string;
  city: string;
  status: 'online' | 'degraded' | 'offline';
  load: number;
  latency: number;
}

const mockNodes: Node[] = [
  { id: 'n1', name: 'HQ Alpha', city: 'London', status: 'online', load: 34, latency: 12 },
  { id: 'n2', name: 'Node Bravo', city: 'New York', status: 'online', load: 67, latency: 28 },
  { id: 'n3', name: 'Node Charlie', city: 'Singapore', status: 'degraded', load: 89, latency: 45 },
  { id: 'n4', name: 'Node Delta', city: 'Berlin', status: 'online', load: 21, latency: 18 },
  { id: 'n5', name: 'Node Echo', city: 'Sydney', status: 'online', load: 55, latency: 62 },
  { id: 'n6', name: 'Node Foxtrot', city: 'Dubai', status: 'offline', load: 0, latency: 999 },
];

export function GlobalNodeGrid() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);

  useEffect(() => {
    const interval = setInterval(() => {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          load: Math.min(100, Math.max(0, n.load + (Math.random() * 10 - 5))),
          latency: n.status === 'offline' ? 999 : Math.max(5, n.latency + (Math.random() * 6 - 3)),
        }))
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-primary/10 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Global Node Grid</CardTitle>
          <Mono className="text-primary animate-pulse">LIVE NETWORK</Mono>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node, i) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative p-4 rounded-lg border border-border/60 bg-secondary/20 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={
                      node.status === 'online'
                        ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
                        : node.status === 'degraded'
                        ? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      'w-2.5 h-2.5 rounded-full',
                      node.status === 'online' && 'bg-primary shadow-[0_0_8px_var(--primary)]',
                      node.status === 'degraded' && 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
                      node.status === 'offline' && 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    )}
                  />
                  <span className="text-sm font-semibold">{node.name}</span>
                </div>
                <Mono className="text-muted-foreground">{node.city}</Mono>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Load</span>
                  <Mono className="text-primary">{Math.round(node.load)}%</Mono>
                </div>
                <div className="h-1 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      'h-full rounded-full',
                      node.load > 80 ? 'bg-red-400' : node.load > 50 ? 'bg-amber-400' : 'bg-primary'
                    )}
                    animate={{ width: `${node.load}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Latency</span>
                  <Mono className={node.latency > 100 ? 'text-red-400' : 'text-primary'}>
                    {node.latency === 999 ? '—' : `${Math.round(node.latency)}ms`}
                  </Mono>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── Neural Response Radar ─────────── */
interface RadarBlip {
  id: string;
  angle: number;
  distance: number;
  label: string;
  type: 'lead' | 'response' | 'capture';
}

const mockBlips: RadarBlip[] = [
  { id: 'b1', angle: 30, distance: 60, label: 'Inbound Lead', type: 'lead' },
  { id: 'b2', angle: 120, distance: 80, label: 'Auto-Response', type: 'response' },
  { id: 'b3', angle: 200, distance: 45, label: 'Capture Event', type: 'capture' },
  { id: 'b4', angle: 280, distance: 70, label: 'Inbound Lead', type: 'lead' },
  { id: 'b5', angle: 350, distance: 30, label: 'Capture Event', type: 'capture' },
];

export function NeuralResponseRadar() {
  const [sweepAngle, setSweepAngle] = useState(0);
  const [blips, setBlips] = useState<RadarBlip[]>(mockBlips);

  useEffect(() => {
    const interval = setInterval(() => {
      setSweepAngle((prev) => (prev + 2) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlips((prev) =>
        prev.map((b) => ({
          ...b,
          angle: (b.angle + Math.random() * 4 - 2) % 360,
          distance: Math.min(90, Math.max(10, b.distance + (Math.random() * 6 - 3))),
        }))
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-primary/10 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Neural Response Radar</CardTitle>
          <Mono className="text-primary animate-pulse">SCANNING</Mono>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-64 h-64">
          {/* Radar rings */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border border-primary/20"
              style={{
                width: `${i * 25}%`,
                height: `${i * 25}%`,
                top: `${50 - (i * 25) / 2}%`,
                left: `${50 - (i * 25) / 2}%`,
              }}
            />
          ))}
          {/* Crosshairs */}
          <div className="absolute top-0 left-1/2 w-px h-full bg-primary/10" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-primary/10" />

          {/* Sweep line */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[50%] h-px origin-left"
            style={{ rotate: sweepAngle }}
          >
            <div className="w-full h-full bg-gradient-to-r from-primary/80 to-transparent" />
          </motion.div>

          {/* Blips */}
          {blips.map((blip) => {
            const rad = (blip.angle * Math.PI) / 180;
            const x = 50 + (blip.distance / 2) * Math.cos(rad);
            const y = 50 + (blip.distance / 2) * Math.sin(rad);
            return (
              <motion.div
                key={blip.id}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  background:
                    blip.type === 'lead'
                      ? '#00f2ff'
                      : blip.type === 'response'
                      ? '#fbbf24'
                      : '#a78bfa',
                  boxShadow:
                    blip.type === 'lead'
                      ? '0 0 10px #00f2ff'
                      : blip.type === 'response'
                      ? '0 0 10px #fbbf24'
                      : '0 0 10px #a78bfa',
                }}
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: parseInt(blip.id.slice(1)) * 0.2 }}
              />
            );
          })}

          {/* Center */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_var(--primary)]" />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 w-full">
          {[
            { label: 'Inbound Leads', value: '142', color: 'primary' },
            { label: 'Auto-Responses', value: '138', color: 'amber' },
            { label: 'Captures', value: '124', color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <Mono className="text-muted-foreground block mb-1">{stat.label}</Mono>
              <motion.div
                className={cn(
                  'text-2xl font-bold',
                  stat.color === 'primary' && 'text-primary',
                  stat.color === 'amber' && 'text-amber-400',
                  stat.color === 'purple' && 'text-purple-400'
                )}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {stat.value}
              </motion.div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────── Campaign Rescue Studio ─────────── */
interface Campaign {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  recovered: number;
  targets: number;
  channel: string;
}

const mockCampaigns: Campaign[] = [
  { id: 'c1', name: 'Missed Call Recovery', status: 'running', recovered: 34, targets: 120, channel: 'SMS' },
  { id: 'c2', name: 'Quote Follow-Up', status: 'running', recovered: 18, targets: 56, channel: 'Email+SMS' },
  { id: 'c3', name: 'No-Show Rescue', status: 'paused', recovered: 7, targets: 23, channel: 'Email' },
  { id: 'c4', name: 'Winback Q2', status: 'running', recovered: 42, targets: 200, channel: 'Multi' },
];

export function CampaignRescueStudio() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);

  useEffect(() => {
    const interval = setInterval(() => {
      setCampaigns((prev) =>
        prev.map((c) => ({
          ...c,
          recovered: c.status === 'running' ? Math.min(c.targets, c.recovered + Math.floor(Math.random() * 3)) : c.recovered,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-primary/10 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Campaign Rescue Studio</CardTitle>
          <NeonBadge color="primary">MISSION CONTROL</NeonBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {campaigns.map((campaign, i) => {
          const pct = Math.round((campaign.recovered / campaign.targets) * 100);
          return (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-lg border border-border/60 bg-secondary/20 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      campaign.status === 'running' && 'bg-primary animate-pulse',
                      campaign.status === 'paused' && 'bg-amber-400',
                      campaign.status === 'completed' && 'bg-green-400'
                    )}
                  />
                  <span className="text-sm font-semibold">{campaign.name}</span>
                </div>
                <NeonBadge color={campaign.status === 'running' ? 'primary' : campaign.status === 'paused' ? 'amber' : 'primary'}>
                  {campaign.status}
                </NeonBadge>
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <Mono className="text-muted-foreground">{campaign.channel}</Mono>
                <Mono className="text-primary">
                  {campaign.recovered} / {campaign.targets}
                </Mono>
              </div>

              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-primary' : 'bg-amber-400'
                  )}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ─────────── Premium Quote Architecture ─────────── */
interface Quote {
  id: string;
  client: string;
  service: string;
  amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'expired';
  date: string;
}

const mockQuotes: Quote[] = [
  { id: 'q1', client: 'Clear Line Plumbing', service: 'Emergency Repair', amount: 1240, status: 'sent', date: '2025-05-18' },
  { id: 'q2', client: 'Skyline Law', service: 'Case Intake', amount: 3500, status: 'accepted', date: '2025-05-17' },
  { id: 'q3', client: 'Glow Med Spa', service: 'Monthly Retainer', amount: 2800, status: 'draft', date: '2025-05-16' },
  { id: 'q4', client: 'FastTrack Delivery', service: 'Dispatch Setup', amount: 5600, status: 'sent', date: '2025-05-15' },
];

export function PremiumQuoteArchitecture() {
  return (
    <Card className="border-primary/10 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Premium Quote Architecture</CardTitle>
          <div className="px-2 py-1 rounded border border-primary/40 bg-primary/10 text-[10px] font-bold uppercase tracking-widest text-primary">
            VANTA13 AUTHENTICATED
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mockQuotes.map((quote, i) => (
          <motion.div
            key={quote.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-4 rounded-lg border border-border/60 bg-secondary/20 hover:border-primary/20 transition-colors group"
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold group-hover:text-primary transition-colors">{quote.client}</div>
              <div className="text-xs text-muted-foreground">{quote.service}</div>
              <Mono className="text-muted-foreground">{quote.date}</Mono>
            </div>
            <div className="text-right space-y-1">
              <div className="text-lg font-bold text-primary">${quote.amount.toLocaleString()}</div>
              <NeonBadge
                color={
                  quote.status === 'accepted' ? 'primary' : quote.status === 'sent' ? 'amber' : 'destructive'
                }
              >
                {quote.status}
              </NeonBadge>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ─────────── Compliance & Trust Ledger ─────────── */
interface IntegrityEvent {
  id: string;
  type: 'consent' | 'opt_out' | 'audit' | 'data_deletion';
  description: string;
  timestamp: string;
  status: 'pass' | 'fail' | 'warn';
}

const mockEvents: IntegrityEvent[] = [
  { id: 'e1', type: 'consent', description: 'SMS consent recorded for +44 7700 900123', timestamp: '14:32:05', status: 'pass' },
  { id: 'e2', type: 'audit', description: 'Lead intake action logged #a7f3c2', timestamp: '14:28:12', status: 'pass' },
  { id: 'e3', type: 'opt_out', description: 'STOP keyword processed for +1 555 0199', timestamp: '14:15:44', status: 'pass' },
  { id: 'e4', type: 'data_deletion', description: 'Tenant data purge initiated (30-day retention)', timestamp: '13:58:00', status: 'warn' },
  { id: 'e5', type: 'audit', description: 'Failed webhook signature verification', timestamp: '13:42:11', status: 'fail' },
];

export function ComplianceTrustLedger() {
  return (
    <Card className="border-primary/10 bg-card/30 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(transparent_50%,_var(--primary)_50%)] bg-[length:100%_4px]" />
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Compliance & Trust Ledger</CardTitle>
          <Mono className="text-primary">INTEGRITY LOG</Mono>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockEvents.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-3 p-3 rounded-md border border-border/40 bg-secondary/10 hover:bg-secondary/30 transition-colors"
          >
            <div
              className={cn(
                'mt-0.5 w-2 h-2 rounded-full shrink-0',
                event.status === 'pass' && 'bg-green-400 shadow-[0_0_6px_#4ade80]',
                event.status === 'warn' && 'bg-amber-400 shadow-[0_0_6px_#fbbf24]',
                event.status === 'fail' && 'bg-red-400 shadow-[0_0_6px_#ef4444]'
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{event.type}</span>
                <Mono className="text-muted-foreground">{event.timestamp}</Mono>
              </div>
              <p className="text-sm mt-0.5 truncate">{event.description}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
