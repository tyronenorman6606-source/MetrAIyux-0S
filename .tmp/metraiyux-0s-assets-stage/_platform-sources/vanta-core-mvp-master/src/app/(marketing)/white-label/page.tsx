import React from 'react';
import Link from 'next/link';
import { Layers, Globe, Zap, Users, ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'White Label AI Operator | Agencies & Resellers',
  description: 'Scale your agency with branded autonomous operators. Deploy VantaCore as your own core infrastructure for your clients.',
};

export default function WhiteLabelPage() {
  const benefits = [
    { title: 'Branded Portals', desc: 'Your clients see your logo, your colors, and your brand. We are the tech behind your agency.', icon: Globe },
    { title: 'Agency Command Center', desc: 'Manage hundreds of clients and their autonomous operators from a single login.', icon: Layers },
    { title: 'Revenue Share', desc: 'Unlock new recurring revenue streams by offering autonomous infrastructure to your portfolio.', icon: Zap },
    { title: 'Client Export', desc: 'Easily move client data, configuration, and history between accounts.', icon: Users }
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-24">
        <div className="flex flex-col md:flex-row gap-16 items-center">
           <div className="flex-1 space-y-8">
            <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Agency Core</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.9]">Scale with <br /><span className="text-primary italic">White Label</span></h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
               Agencies and revenue-ops teams use VantaCore as their core infrastructure. Deploy branded autonomous operators for your entire client portfolio from a single command center.
            </p>
            <div className="flex gap-6">
              <Link href="/contact?type=reseller" className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-[10px] neon-glow">
                Apply for Reseller Access
              </Link>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-square bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center p-8 group hover:border-primary/30 transition-all">
                      <div className="h-full w-full border border-dashed border-white/10 rounded-lg flex items-center justify-center group-hover:border-primary/30">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest group-hover:text-primary/50 transition-colors">Client_{i}</span>
                      </div>
                  </div>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((b) => (
            <div key={b.title} className="p-10 border border-white/5 bg-white/[0.02] rounded-2xl space-y-6 glass-panel hover:border-primary/20 transition-all">
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold uppercase tracking-tight">{b.title}</h3>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-zinc-950 border border-white/5 rounded-2xl p-12 space-y-12 overflow-hidden relative">
           <div className="relative z-10 space-y-6">
              <h2 className="text-4xl font-bold tracking-tighter uppercase italic text-center">Become the Tech Behind the Business</h2>
              <p className="max-w-2xl mx-auto text-muted-foreground font-light leading-relaxed text-center">
                  VantaCore is the nervous system. You are the operator. Together, we provide the most powerful autonomous business platform on the market.
              </p>
              <div className="pt-8 flex justify-center">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-3xl">
                    <div className="text-center space-y-2">
                        <div className="text-4xl font-black text-primary font-mono">100%</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">White Labelable</div>
                    </div>
                     <div className="text-center space-y-2">
                        <div className="text-4xl font-black text-primary font-mono">Multi</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tenant Admin</div>
                    </div>
                     <div className="text-center space-y-2">
                        <div className="text-4xl font-black text-primary font-mono">24/7</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reseller Support</div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-0" />
        </div>

        <div className="text-center pt-12">
            <Link href="/contact" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:text-white transition-colors">
              Schedule an agency demo <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
      </section>
    </div>
  );
}
