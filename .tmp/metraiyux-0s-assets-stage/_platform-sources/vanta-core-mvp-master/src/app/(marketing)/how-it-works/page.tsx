import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, Filter, Users, CalendarCheck, FileText } from 'lucide-react';

export const metadata = {
  title: 'How It Works | VantaCore',
  description: 'Learn how VantaCore automates your business intake, filtering, and booking using VANTA13 intelligence.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      number: '01',
      title: 'Deploy Your Operator',
      desc: 'Connect your phone, website, and socials. VantaCore becomes the intelligent front-door for your entire business.',
      icon: Bot
    },
    {
      number: '02',
      title: 'Filter the Noise',
      desc: 'VANTA13 automatically identifies cold callers and spam, ensuring you only spend time on real revenue opportunities.',
      icon: Filter
    },
    {
      number: '03',
      title: 'Capture & Qualify',
      desc: 'The system engages leads in real-time, asking specific business-pack questions to determine intent and urgency.',
      icon: Users
    },
    {
      number: '04',
      title: 'Book & Follow Up',
      desc: 'Qualified leads are moved directly to your calendar. Unbooked leads are nurtured automatically through follow-up sequences.',
      icon: CalendarCheck
    },
    {
      number: '05',
      title: 'Grow with Content',
      desc: 'Every customer interaction is transformed into blog topics, sales scripts, and newsletter blocks by the Content Autopilot.',
      icon: FileText
    }
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-5xl mx-auto space-y-24">
        <div className="space-y-4 text-center">
          <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Operational Logic</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none">The Engine of <br /><span className="text-primary italic">Autonomy</span></h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            VantaCore isn't just a chatbot. It's a comprehensive business automation platform designed to handle every stage of the customer journey.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className={`flex flex-col md:flex-row gap-12 items-center ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
              <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary neon-glow">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <span className="text-4xl font-black text-white/10 font-mono">{step.number}</span>
                </div>
                <h2 className="text-3xl font-bold uppercase tracking-tight">{step.title}</h2>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">{step.desc}</p>
                <div className="pt-4">
                   <div className="h-[2px] w-24 bg-gradient-to-r from-primary to-transparent" />
                </div>
              </div>
              <div className="flex-1 w-full aspect-video bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-center relative overflow-hidden group glass-panel">
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-primary/20 font-black text-4xl uppercase tracking-[0.5em] group-hover:scale-110 transition-transform">
                  SIMULATION_{step.number}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-16 border-t border-white/5 text-center space-y-8">
          <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Ready to automate?</h2>
          <div className="flex flex-col sm:row gap-6 justify-center">
            <Link href="/onboarding" className="inline-flex items-center gap-2 px-12 py-5 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-sm neon-glow">
              Initialize Your System <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-12 py-5 border border-white/10 hover:border-primary/50 transition-all font-black uppercase tracking-widest rounded-lg text-sm bg-white/5">
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
