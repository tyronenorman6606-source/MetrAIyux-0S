import React from 'react';
import Link from 'next/link';
import { Cpu, MessageSquare, PhoneCall, Bot, BrainCircuit, ArrowRight, FileText } from 'lucide-react';

export const metadata = {
  title: 'VANTA13 | Autonomous AI Business Operator',
  description: 'The autonomous AI operator that filters noise, captures demand, books revenue, and follows up until the money is won.',
};

export default function Vanta13OperatorPage() {
  const capabilities = [
    { title: 'Intent Classification', desc: 'Real-time analysis of every message or call to determine exact customer needs.', icon: BrainCircuit },
    { title: 'Multichannel Voice', desc: 'Natural AI voice interactions that sound human but scale like software.', icon: PhoneCall },
    { title: 'SMS Engagement', desc: 'Instant text-back recovery and persistent SMS follow-up sequences.', icon: MessageSquare },
    { title: 'Dynamic Logic', desc: 'Adjusts intake questions based on previous answers and business rules.', icon: Cpu },
    { title: 'Content Autopilot', desc: 'Transforms call transcripts and messages into blog topics, sales scripts, and newsletters.', icon: FileText }
  ];

  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-24">
        <div className="text-center space-y-8">
          <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Intelligence Layer</span>
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.8] font-mono">VANTA<span className="text-primary italic">13</span></h1>
          <p className="text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
            The autonomous operator that filters noise, captures demand, books revenue, and follows up until the money is won.
          </p>
        </div>

        <div className="relative aspect-[21/9] w-full bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-center overflow-hidden glass-panel group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
            <Bot className="h-32 w-32 text-primary animate-pulse" />
            <div className="absolute top-8 left-8 p-4 border border-white/10 bg-black/50 backdrop-blur rounded font-mono text-[10px] text-muted-foreground space-y-2">
                <div>SYSTEM_STATUS: [ACTIVE]</div>
                <div>NEURAL_LOAD: [4.2%]</div>
                <div>UPTIME: [99.9999%]</div>
                <div className="text-primary">CORE: [VANTA13_STABLE]</div>
            </div>
            <div className="absolute bottom-8 right-8 text-right font-mono text-[10px] text-muted-foreground space-y-2 opacity-50 group-hover:opacity-100 transition-opacity">
                <div>"I'm sorry, I don't handle vendor requests. Please use our portal."</div>
                <div className="text-primary">"I've booked your plumbing estimate for Tuesday at 10 AM."</div>
                <div>"Is there water actively leaking in the kitchen?"</div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {capabilities.map((c) => (
            <div key={c.title} className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-6 glass-panel hover:border-primary/20 transition-all">
              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-tight">{c.title}</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-12 items-center pt-12">
            <div className="flex-1 space-y-6">
                <h2 className="text-4xl font-bold tracking-tighter uppercase italic">Always Learning. Always Growing.</h2>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                    VANTA13 doesn't just follow a script. It understands context, urgency, and customer sentiment. Over time, it learns which leads convert best and optimizes your intake flow automatically.
                </p>
                <div className="pt-4">
                     <Link href="/onboarding" className="px-10 py-4 bg-primary text-black font-black uppercase tracking-widest rounded hover:scale-105 transition-all text-xs neon-glow">
                        Deploy VANTA13
                    </Link>
                </div>
            </div>
            <div className="flex-1 space-y-4">
                {[
                   { label: 'Avg. Response Time', value: '< 1 second' },
                   { label: 'Booking Accuracy', value: '99.8%' },
                   { label: 'Spam Filter Rate', value: '100%' },
                   { label: 'Lead Capture Lift', value: '+42%' }
                ].map(stat => (
                    <div key={stat.label} className="p-6 border border-white/5 bg-white/[0.01] rounded-xl flex justify-between items-center group">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">{stat.label}</span>
                        <span className="text-xl font-bold font-mono text-primary neon-text">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
      </section>
    </div>
  );
}
