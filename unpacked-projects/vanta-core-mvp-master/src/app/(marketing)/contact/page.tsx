import React from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const metadata = {
  title: 'Contact | VantaCore',
  description: 'Connect with the VantaCore team. We are here to help you automate your business infrastructure.',
};

export default function ContactPage() {
  return (
    <div className="pt-24 pb-32 px-6">
      <section className="max-w-7xl mx-auto space-y-24">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 border border-primary/20 bg-primary/5 rounded-full mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Inquiry Channel</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none">Connect <br /><span className="text-primary italic">Now</span></h1>
          <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto">
            Ready to deploy your autonomous operator? Our team is standing by to help you initialize your infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div className="space-y-12">
            <div className="grid grid-cols-1 gap-8">
              {[
                { label: 'Email', value: 'hello@skyesoverlondon.com', icon: Mail },
                { label: 'Phone', value: '+1 (555) VANTA-13', icon: Phone },
                { label: 'Location', value: 'Global / Autonomous', icon: MapPin }
              ].map(item => (
                <div key={item.label} className="flex gap-6 items-start">
                   <div className="h-12 w-12 rounded bg-white/5 flex items-center justify-center text-primary border border-white/5">
                      <item.icon className="h-5 w-5" />
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</div>
                      <div className="text-xl font-bold tracking-tight">{item.value}</div>
                   </div>
                </div>
              ))}
            </div>

            <div className="p-8 border border-white/5 bg-primary/5 rounded-2xl space-y-4 glass-panel">
               <h3 className="text-lg font-bold uppercase tracking-tight text-primary">Priority Support</h3>
               <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  Existing clients can access priority support via their dashboard or by using the emergency keyword in their support thread.
               </p>
            </div>
          </div>

          <form className="space-y-6 glass-panel p-10 border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-muted-foreground opacity-20">
               FORM_ID: CONTACT_SECURE_v1
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded p-4 text-sm focus:border-primary outline-none transition-colors" placeholder="John Doe" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Work Email</label>
                  <input type="email" className="w-full bg-white/5 border border-white/10 rounded p-4 text-sm focus:border-primary outline-none transition-colors" placeholder="john@company.com" />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Subject</label>
               <select className="w-full bg-white/5 border border-white/10 rounded p-4 text-sm focus:border-primary outline-none transition-colors appearance-none">
                  <option>General Inquiry</option>
                  <option>Reseller Application</option>
                  <option>Setup Service Request</option>
                  <option>Technical Support</option>
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Message</label>
               <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded p-4 text-sm focus:border-primary outline-none transition-colors" placeholder="How can we help?" />
            </div>
            <button type="button" className="w-full py-5 bg-primary text-black font-black uppercase tracking-widest rounded-lg hover:scale-105 transition-all text-xs neon-glow flex items-center justify-center gap-2">
               Transmit Message <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
