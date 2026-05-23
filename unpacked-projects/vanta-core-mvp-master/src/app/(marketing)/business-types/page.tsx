import React from 'react';
import Link from 'next/link';
import { Home, Briefcase, HeartPulse, Utensils, Building2, Car, ShoppingBag, Palette, Dumbbell, Gavel, Truck, Monitor } from 'lucide-react';

export const metadata = {
  title: 'Business Packs | VantaCore',
  description: 'Vertical-specific autonomous operators for every industry. Select your business pack and launch in minutes.',
};

export default function BusinessTypesPage() {
  const types = [
    { name: 'Home Services', examples: 'Plumbing, HVAC, Electrical, Roofing', icon: Home },
    { name: 'Professional Services', examples: 'Accounting, Consulting, Insurance', icon: Briefcase },
    { name: 'Medical & Wellness', examples: 'Med Spas, Clinics, Dental, Therapy', icon: HeartPulse },
    { name: 'Hospitality', examples: 'Restaurants, Event Spaces, Hotels', icon: Utensils },
    { name: 'Real Estate', examples: 'Agencies, Property Management', icon: Building2 },
    { name: 'Automotive', examples: 'Repair Shops, Detailers, Dealerships', icon: Car },
    { name: 'Retail & Commerce', examples: 'Boutiques, E-commerce, Local Shops', icon: ShoppingBag },
    { name: 'Creative & Agency', examples: 'Design, Marketing, Production', icon: Palette },
    { name: 'Fitness & Coaching', examples: 'Gyms, Studios, Personal Trainers', icon: Dumbbell },
    { name: 'Legal Intake', examples: 'Law Firms, Legal Aid, Mediation', icon: Gavel },
    { name: 'Delivery & Dispatch', examples: 'Couriers, Logistics, Moving', icon: Truck },
    { name: 'Tech & SaaS', examples: 'Support, Intake, Sales Ops', icon: Monitor },
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Vertical Intelligence</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none">Business <br /><span className="text-primary italic">Packs</span></h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Every business is unique. Our pre-configured packs include industry-specific intake logic, urgency rules, and follow-up templates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {types.map((type) => (
            <div key={type.name} className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-6 hover:border-primary/20 transition-all group glass-panel flex flex-col justify-between">
              <div className="space-y-4">
                <div className="h-10 w-10 rounded bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                  <type.icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold uppercase tracking-tight">{type.name}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.15em] leading-relaxed font-light">{type.examples}</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                  <Link href={`/onboarding?pack=${type.name.toLowerCase().replace(/ /g, '-')}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2">
                      Deploy Pack &rarr;
                  </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-16 border-t border-white/5 text-center">
            <p className="text-sm text-muted-foreground mb-8 font-light italic">Don't see your industry? Our General Business Pack works for 99% of use cases.</p>
            <Link href="/onboarding" className="px-12 py-5 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-sm neon-glow">
              Launch Custom Operator
            </Link>
        </div>
      </section>
    </div>
  );
}
