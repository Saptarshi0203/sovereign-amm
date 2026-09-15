'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/lib/store';

const TIERS = [
  {
    name: 'Community Node',
    price: 'Free',
    description: 'For prosumers and researchers',
    features: [
      'Basic L2 order book access',
      'Standard micro-prices',
      'Zero-knowledge solvency wallets',
      '10 Hz data feed',
    ],
    cta: 'Sign Up for Free',
    featured: false,
    contactLink: false,
  },
  {
    name: 'Pro Market Maker',
    price: '$49/mo',
    description: 'For algorithmic traders',
    features: [
      'GLFT parameter tuning',
      'API access for algorithmic trading',
      'Rainflow degradation analytics',
      'Priority order routing',
    ],
    cta: 'Start Pro Trial',
    featured: true,
    contactLink: false,
  },
  {
    name: 'Grid Operator',
    price: 'Custom',
    description: 'For utilities and grid operators',
    features: [
      'Full DC-OPF solvers',
      'Shapley value settlement',
      'Dedicated vector DB',
      'Custom PTDF topologies',
    ],
    cta: 'Contact Sales',
    featured: false,
    contactLink: true,
  },
] as const;

const FAQ = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — Community Node is permanently free with no credit card required. Pro Market Maker includes a 14-day free trial.',
  },
  {
    q: 'How does 10 Hz pricing work?',
    a: 'The GLFT market maker updates bid/ask quotes 10 times per second using the current battery SoC, volatility, and order book state. No prediction — pure physics.',
  },
  {
    q: 'What is Rainflow degradation pricing?',
    a: 'Each trade surcharges the ask by the marginal battery wear cost, computed in real time from the streaming DoD (Depth of Discharge) using the Wöhler fatigue curve.',
  },
  {
    q: 'Can I run this on my own hardware?',
    a: 'Grid Operator tier includes a self-hosted deployment option. Contact us for hardware requirements and licensing.',
  },
] as const;

export default function PricingPage() {
  const openAuth = useStore((s) => s.openAuth);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono mb-2">PRICING</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          Scale Your Energy Alpha.
        </h1>
        <p className="text-slate-400 mt-3">Choose Your Node.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col rounded-xl border p-6 relative ${
              tier.featured
                ? 'border-emerald-500 bg-emerald-900/10'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-mono rounded-full whitespace-nowrap">
                MOST POPULAR
              </div>
            )}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">{tier.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{tier.description}</p>
            </div>
            <p className="text-3xl font-bold font-mono text-white mb-6">{tier.price}</p>
            <ul className="flex flex-col gap-2 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            {tier.contactLink ? (
              <Link
                href="/contact"
                className="w-full py-2.5 text-center text-sm font-semibold rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
              >
                {tier.cta}
              </Link>
            ) : (
              <button
                onClick={() => openAuth('signup')}
                className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  tier.featured
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                {tier.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-200 hover:text-white transition-colors"
              >
                {item.q}
                {openFaq === i ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                )}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-400 border-t border-slate-800 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
