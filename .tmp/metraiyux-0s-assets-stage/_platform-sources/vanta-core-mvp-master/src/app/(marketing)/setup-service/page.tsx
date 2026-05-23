import React from 'react';
import Link from 'next/link';
import { Settings, Wrench, Rocket, ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Setup Service | VantaCore by Skyes Over London',
  description: 'White-glove implementation for your autonomous business operator. We build, configure, and launch your VantaCore instance.',
};

export default function SetupServicePage() {
  const packages = [
    { 
      name: 'Basic Setup', 
      price: '500', 
      desc: 'Core configuration for a single location.',
      items: ['Business Profile Setup', 'General Business Pack', 'Single Calendar Sync', 'Standard Lead Firewall', '1 Week Support']
    },
    { 
      name: 'Standard Implementation', 
      price: '750', 
      desc: 'Custom industry vertical optimization.',
      items: ['Industry Business Pack', 'Custom Intake Rules', 'SMS & Voice Sync', 'Booking Engine Config', 'Follow-up Templates', '2 Weeks Support'],
      highlighted: true
    },
    { 
      name: 'Premium Deployment', 
      price: '1,500', 
      desc: 'Full-scale autonomous operation build.',
      items: ['Advanced Custom Packs', 'Multi-location Setup', 'CRM Integrations', 'Custom Routing Rules', 'Staff Training', '30 Days Priority Support']
    }
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-24">
         <div className="flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1 space-y-8">
            <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Done-For-You</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-[0.9]">White-Glove <br /><span className="text-primary italic">Setup</span></h1>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              Don't have time to configure your operator? Let the experts at Skyes Over London handle the implementation. We ensure your VantaCore instance is optimized for maximum revenue protection from day one.
            </p>
            <div className="flex gap-6">
              <Link href="/contact?type=setup" className="px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-[10px] neon-glow">
                Request Implementation
              </Link>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-4 glass-panel hover:border-primary/20 transition-all text-center">
                  <Settings className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-[10px] font-bold uppercase tracking-widest">Configuration</div>
              </div>
              <div className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-4 glass-panel hover:border-primary/20 transition-all text-center">
                  <Wrench className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-[10px] font-bold uppercase tracking-widest">Integration</div>
              </div>
              <div className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-4 glass-panel hover:border-primary/20 transition-all text-center">
                  <Rocket className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-[10px] font-bold uppercase tracking-widest">Launch</div>
              </div>
              <div className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-4 glass-panel hover:border-primary/20 transition-all text-center">
                  <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                  <div className="text-[10px] font-bold uppercase tracking-widest">Optimization</div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg) => (
            <div key={pkg.name} className={`p-10 border rounded-2xl flex flex-col space-y-8 glass-panel ${
              pkg.highlighted ? 'border-primary' : 'border-white/10'
            }`}>
              <div className="space-y-2">
                <h3 className="text-xl font-bold uppercase tracking-widest text-primary">{pkg.name}</h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">{pkg.desc}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black">${pkg.price}</span>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">Setup Fee</span>
              </div>

              <ul className="flex-1 space-y-4">
                {pkg.items.map(item => (
                  <li key={item} className="text-[10px] flex items-center gap-3 font-bold tracking-widest uppercase text-muted-foreground">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>

              <Link 
                href={`/contact?package=${pkg.name.toLowerCase().replace(/ /g, '-')}`}
                className={`w-full py-4 rounded font-black uppercase tracking-widest text-[10px] transition-all text-center ${
                  pkg.highlighted ? 'bg-primary text-black neon-glow hover:scale-105' : 'border border-white/10 hover:border-primary/50'
                }`}
              >
                Select {pkg.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
