import React from 'react';
import Link from 'next/link';
import { ShieldAlert, UserCheck, XCircle, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Lead Firewall | Cold Call Filter for Business',
  description: 'The ultimate cold call filter for business. VANTA13 Lead Firewall identifies, classifies, and routes spam, vendors, and noise away from you.',
};

export default function LeadFirewallPage() {
  const filters = [
    { title: 'Cold Call Suppression', desc: 'Instantly identify and route solicitors to the vendor intake flow.', icon: XCircle },
    { title: 'Spam Identification', desc: 'Automatic blocking of known robocalls and SEO agency spam.', icon: ShieldAlert },
    { title: 'Buyer Verification', desc: 'Verify intent before a call ever reaches your phone or dashboard.', icon: UserCheck },
    { title: 'Emergency Routing', desc: 'Identify high-urgency keywords to bypass the firewall for real crises.', icon: Zap }
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-24">
        <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Noise Cancellation</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none">The <br /><span className="text-primary italic">Firewall</span></h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              Every business is under siege by cold callers, vendors, and spam. VantaCore’s Lead Firewall is the intelligent shield that protects your time and sanity.
            </p>
            <div className="flex gap-6">
              <Link href="/onboarding" className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-[10px] neon-glow">
                Activate Shield
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full aspect-square bg-white/[0.02] border border-white/5 rounded-full flex items-center justify-center relative overflow-hidden glass-panel group">
             <div className="absolute inset-0 bg-primary/5 animate-pulse" />
             <ShieldCheck className="h-48 w-48 text-primary/20 group-hover:text-primary/40 transition-colors" />
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-[300px] w-[300px] border border-primary/10 rounded-full animate-ping" />
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filters.map((f) => (
            <div key={f.title} className="p-10 border border-white/5 bg-white/[0.02] rounded-2xl space-y-6 glass-panel hover:border-primary/20 transition-all">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tight">{f.title}</h3>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-12 space-y-8 text-center">
          <h2 className="text-4xl font-bold tracking-tighter uppercase italic">The Vendor Trap</h2>
          <p className="max-w-2xl mx-auto text-muted-foreground font-light leading-relaxed">
            Stop being interrupted by "partnership opportunities." Our Vendor Intake process routes solicitors to a private inbox where you can review them on your terms—not theirs.
          </p>
          <div className="pt-4 flex justify-center">
             <div className="inline-flex items-center gap-4 px-6 py-3 border border-primary/20 bg-primary/5 rounded font-mono text-xs text-primary">
                <span className="animate-pulse">●</span> ANALYZING_INCOMING_CALL... [VENDOR_DETECTED] {"->"} ROUTING_TO_TRAP
             </div>
          </div>
        </div>

        <div className="text-center pt-12">
            <Link href="/onboarding" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
              Deploy your lead firewall today <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
      </section>
    </div>
  );
}
