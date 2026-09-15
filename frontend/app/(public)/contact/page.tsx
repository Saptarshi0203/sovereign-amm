'use client';

/**
 * Contact Page — Sovereign-AMM
 *
 * Lab contact details, mailto/tel links, social links, and a client-side
 * contact form (no backend — UI only). Consistent with the dark terminal
 * aesthetic (bg-slate-950, emerald accents).
 *
 * Requirements: 2.3, 1.2, 17.2
 */

import { useState, type FormEvent } from 'react';
import { Mail, Phone, MapPin, Github, Linkedin, Send, CheckCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// ContactForm
// ---------------------------------------------------------------------------

/**
 * ContactForm — client-side only form. No submission to a backend.
 * Shows a success state after submission to mimic real behaviour.
 */
function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [fields, setFields] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // No backend — just flip to success state for UI demonstration
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-white">Message received</h3>
        <p className="text-sm text-slate-400 max-w-xs">
          Thanks for reaching out. We will get back to you as soon as possible.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setFields({ name: '', email: '', message: '' });
          }}
          className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Contact form">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-name" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          required
          placeholder="Jane Smith"
          value={fields.name}
          onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-email" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder="jane@example.com"
          value={fields.email}
          onChange={(e) => setFields((p) => ({ ...p, email: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          placeholder="Your message…"
          value={fields.message}
          onChange={(e) => setFields((p) => ({ ...p, message: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors self-start"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        Send Message
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
            Contact Us
          </h1>
          <p className="text-lg text-slate-400">
            Reach the Sovereign-AMM team.
          </p>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Left — contact details */}
          <div className="space-y-8">
            <div>
              <h2 className="text-base font-semibold text-white mb-4">Get in touch</h2>
              <div className="space-y-4">

                {/* Address */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">Lab Address</p>
                    <p className="text-sm text-slate-400">Energy Systems Lab</p>
                    <p className="text-sm text-slate-400">Block A, Room 101</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Mail className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">Email</p>
                    <a
                      href="mailto:@sovereign-amm.com"
                      className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
                    >
                      @sovereign-amm.com
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-md bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Phone className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-300">Phone</p>
                    <a
                      href="tel:+919907418830"
                      className="text-sm text-slate-400 hover:text-white transition-colors font-mono"
                    >
                      +91 99074 18830
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Social links */}
            <div>
              <h2 className="text-base font-semibold text-white mb-4">Connect</h2>
              <div className="flex gap-3">
                <a
                  href="https://github.com/riturajbarman"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Github className="w-5 h-5" aria-hidden="true" />
                </a>
                <a
                  href="https://linkedin.com/company/sovereign-amm"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <Linkedin className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          {/* Right — contact form */}
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h2 className="text-base font-semibold text-white mb-6">Send a message</h2>
            <ContactForm />
          </div>

        </div>
      </div>
    </div>
  );
}
