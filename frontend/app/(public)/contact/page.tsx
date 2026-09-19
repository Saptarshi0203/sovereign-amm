'use client';

import { useState, type FormEvent } from 'react';
import { Mail, Phone, MapPin, Github, Linkedin, Send, CheckCircle } from 'lucide-react';
import { SectionLabel, Statement, Hairline } from '@/components/ui/Editorial';

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [fields, setFields] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-emerald-500/50 text-emerald-500">
          <CheckCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="font-display text-lg font-bold text-white">Message received</h3>
        <p className="text-sm text-slate-400">Thanks for reaching out. We will get back to you as soon as possible.</p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setFields({ name: '', email: '', message: '' }); }}
          className="btn-ghost"
        >
          Send another message
        </button>
      </div>
    );
  }

  const inputCls = 'w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Contact form">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-name" className="label-caps">Name</label>
        <input id="contact-name" type="text" required placeholder="Jane Smith" value={fields.name}
          onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-email" className="label-caps">Email</label>
        <input id="contact-email" type="email" required placeholder="jane@example.com" value={fields.email}
          onChange={(e) => setFields((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="label-caps">Message</label>
        <textarea id="contact-message" required rows={5} placeholder="Your message…" value={fields.message}
          onChange={(e) => setFields((p) => ({ ...p, message: e.target.value }))}
          className={`${inputCls} resize-none`} />
      </div>
      <button type="submit" className="btn-brand self-start">
        <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Send message
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <SectionLabel n="01">Contact</SectionLabel>

      <div className="mt-10 grid gap-16 lg:grid-cols-12">
        {/* Left: statement + contact details */}
        <div className="lg:col-span-5">
          <Statement title="Reach the Sovereign-AMM team.">
            We are researchers, engineers, and grid operators. Reach us directly.
          </Statement>

          <div className="mt-10 space-y-6">
            <Hairline />
            {[
              { icon: MapPin,  label: 'Lab',   value: 'Energy Systems Lab · Block A, Room 101' },
              { icon: Mail,    label: 'Email',  value: '@sovereign-amm.com', href: 'mailto:@sovereign-amm.com' },
              { icon: Phone,   label: 'Phone',  value: '+91 99074 18830', href: 'tel:+919907418830' },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-edge/40 text-slate-400">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="label-caps">{label}</p>
                  {href
                    ? <a href={href} className="font-mono text-sm text-telemetry hover:underline underline-offset-4">{value}</a>
                    : <p className="text-sm text-slate-300">{value}</p>
                  }
                </div>
              </div>
            ))}
            <Hairline />
            <div className="flex gap-3">
              {[
                { href: 'https://github.com/riturajbarman', Icon: Github, label: 'GitHub' },
                { href: 'https://linkedin.com/company/sovereign-amm', Icon: Linkedin, label: 'LinkedIn' },
              ].map(({ href, Icon, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge/50 text-slate-400 transition-colors hover:border-white/50 hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="lg:col-span-7">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <p className="label-caps mb-6">Send a message</p>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
