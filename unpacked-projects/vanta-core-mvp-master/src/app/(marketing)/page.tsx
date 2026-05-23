import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, ShieldCheck, CalendarCheck, Zap, BarChart3, Globe, Phone } from 'lucide-react';

export const metadata = {
  title: 'VantaCore by Skyes Over London | Autonomous Business Infrastructure',
  description: 'VantaCore answers calls, filters cold callers, captures leads, books customers, follows up automatically, requests reviews, and gives every business a revenue command center.',
};

export default function HomePage() {
  const features = [
    {
      title: 'VANTA13 AI Operator',
      desc: 'The autonomous operator that filters noise, captures demand, books revenue, and follows up until the money is won.',
      icon: Bot,
      href: '/vanta13-operator'
    },
    {
      title: 'Lead Firewall',
      desc: 'Intelligent cold-call suppression, spam filtering, and vendor trap routing that protects your time.',
      icon: ShieldCheck,
      href: '/lead-firewall'
    },
    {
      title: 'Autonomous Booking',
      desc: 'Calendar-aware appointment booking with confirmation, rescheduling, and no-show recovery built in.',
      icon: CalendarCheck,
      href: '/how-it-works'
    },
    {
      title: 'Follow-Up Autopilot',
      desc: 'Missed-call text-back, quote follow-up, review requests, and reactivation campaigns on autopilot.',
      icon: Zap,
      href: '/how-it-works'
    },
    {
      title: 'Revenue Intelligence',
      desc: 'Real dashboard metrics: leads captured, calls answered, cold calls blocked, revenue protected.',
      icon: BarChart3,
      href: '/pricing'
    },
    {
      title: 'White Label & Agencies',
      desc: 'Deploy branded autonomous operators for your entire client portfolio from a single command center.',
      icon: Globe,
      href: '/white-label'
    }
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1 border border-primary/20 bg-primary/5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Autonomous Business Infrastructure</span>
            </div>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85]">
              The Tech<br />
              <span className="text-primary italic">Behind</span> the Business
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed">
              VantaCore answers calls, filters cold callers, captures leads, books customers, follows up automatically, requests reviews, and gives every business a revenue command center.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 px-12 py-5 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-sm neon-glow"
              >
                Initialize Your Operator <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 px-12 py-5 border border-white/10 hover:border-primary/50 transition-all font-black uppercase tracking-widest rounded-lg text-sm bg-white/5"
              >
                See How It Works
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-white/5">
            {[
              { label: 'Calls Answered', value: '24/7' },
              { label: 'Cold Calls Blocked', value: '100%' },
              { label: 'Lead Capture Lift', value: '+42%' },
              { label: 'Avg Response', value: '< 1s' },
            ].map((stat) => (
              <div key={stat.label} className="text-center space-y-1 p-4">
                <div className="text-2xl md:text-3xl font-black text-primary font-mono">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Capability Matrix</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">One Platform.<br /><span className="text-primary italic">Every Channel.</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="p-8 border border-white/5 bg-white/[0.02] rounded-2xl space-y-6 hover:border-primary/20 transition-all group glass-panel"
              >
                <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-light leading-relaxed">{f.desc}</p>
                <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase italic">
            Stop Missing Money.
          </h2>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
            Every missed call is a lost opportunity. Every cold caller is stolen focus. VantaCore ensures your business never sleeps, never forgets, and never leaves revenue on the table.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-12 py-5 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-sm neon-glow"
            >
              View Pricing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-12 py-5 border border-white/10 hover:border-primary/50 transition-all font-black uppercase tracking-widest rounded-lg text-sm bg-white/5"
            >
              <Phone className="h-4 w-4" /> Book a Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
