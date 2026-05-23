import React from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Pricing | VantaCore',
  description: 'Simple, transparent pricing for autonomous business infrastructure. Scale your front office without increasing headcount.',
};

export default function PricingPage() {
  const plans = [
    { 
      name: 'Lead Defense', 
      price: '97', 
      description: 'Perfect for small businesses needing to recover missed calls and filter spam.',
      features: ['Missed-call text-back', 'Basic cold-call filter', 'Basic follow-up', 'Lead Command Center', 'Single Staff Seat', 'Weekly Revenue Report'] 
    },
    { 
      name: 'Business Operator', 
      price: '197', 
      description: 'Complete autonomous intake and booking for growing service businesses.',
      features: ['AI Intake Operator', 'Full Qualification Flow', 'Booking Automation', 'Business Pack Setup', 'Review Automation', 'Owner Alerts', 'Customer Memory', 'Multi-channel (Web/SMS)'],
      highlighted: true 
    },
    { 
      name: 'Growth Operator', 
      price: '297', 
      description: 'Advanced automation and intelligence for companies scaling at speed.',
      features: ['Advanced Automations', 'Reactivation Campaigns', 'Content Autopilot 2.0', 'Revenue Intelligence', 'Vendor Trap Inbox', 'Agency Reporting', 'Custom Routing Rules', 'Priority Support', 'Full API Access'] 
    }
  ];

  return (
    <div className="px-4 pt-20 pb-28 sm:px-6 sm:pt-24 sm:pb-32">
      <section className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <span className="text-[10px] font-bold uppercase tracking-normal text-primary sm:tracking-[0.3em]">Platform Access</span>
          </div>
          <h1 className="text-4xl font-bold uppercase leading-none sm:text-6xl md:text-8xl">Scalable <br /><span className="text-primary italic">Intelligence</span></h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Choose the level of autonomy your business requires. No hidden fees. No long-term contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative flex min-w-0 flex-col space-y-8 rounded-2xl border p-6 glass-panel sm:p-10 ${
              plan.highlighted ? 'border-primary ring-1 ring-primary/50' : 'border-white/10'
            }`}>
              {plan.highlighted && (
                <div className="absolute top-0 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-normal text-black shadow-glow sm:tracking-widest">
                  Most Popular
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold uppercase tracking-normal text-primary sm:tracking-widest">{plan.name}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black">${plan.price}</span>
                <span className="text-muted-foreground text-xs uppercase font-bold tracking-widest">/ month</span>
              </div>

              <ul className="flex-1 space-y-4">
                {plan.features.map(f => (
                  <li key={f} className="flex min-w-0 items-start gap-3 text-xs font-light uppercase tracking-normal sm:tracking-wide">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 break-words">{f}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/onboarding" 
                className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-5 text-center text-xs font-black uppercase tracking-normal transition-all sm:tracking-widest ${
                  plan.highlighted ? 'bg-primary text-black neon-glow hover:scale-105' : 'border border-white/10 hover:border-primary/50 hover:bg-white/5'
                }`}
              >
                <span className="min-w-0 break-words">Initialize {plan.name}</span> <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          ))}
        </div>

        <div className="pt-24 grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-white/5">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Implementation Services</h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed">
              Need a white-glove setup? Our team at Skyes Over London can build your custom Business Pack, configure advanced routing, and integrate VantaCore into your existing workflow.
            </p>
            <div className="pt-4">
               <Link href="/setup-service" className="flex items-center gap-2 text-xs font-black uppercase tracking-normal text-primary transition-colors hover:text-white sm:tracking-widest">
                  View Setup Packages &rarr;
              </Link>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 space-y-6 glass-panel">
            <h3 className="text-xl font-bold uppercase tracking-tight">Enterprise & Multi-Location</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              For agencies, franchises, and large-scale operations requiring custom integrations, dedicated instances, and white-labeling.
            </p>
            <Link href="/contact" className="inline-block rounded border border-white/10 bg-white/5 px-8 py-4 text-[10px] font-black uppercase tracking-normal transition-all hover:border-primary/50 sm:tracking-widest">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
