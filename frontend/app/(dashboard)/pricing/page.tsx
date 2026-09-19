'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, ChevronDown, ArrowRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { SectionLabel, Statement, Hairline, Reveal } from '@/components/ui/Editorial';
import { DataTable } from '@/components/ui/DataTable';

const TIERS = [
  {
    name: 'Community Node',
    price: 'Free',
    sub: 'For prosumers and researchers',
    features: [
      'Basic L2 order book access',
      'Standard micro-prices',
      'Zero-knowledge solvency wallets',
      '10 Hz data feed',
      'Demo paper wallet',
    ],
    cta: 'Sign up free',
    featured: false,
    contactLink: false,
  },
  {
    name: 'Pro Market Maker',
    price: '₹3,999 / mo',
    sub: 'For algorithmic traders',
    features: [
      'GLFT parameter tuning',
      'API access for algorithmic trading',
      'Rainflow degradation analytics',
      'Priority order routing',
      'Live settlement stream',
    ],
    cta: 'Start pro trial',
    featured: true,
    contactLink: false,
  },
  {
    name: 'Grid Operator',
    price: 'Custom',
    sub: 'For utilities and grid operators',
    features: [
      'Full DC-OPF solvers',
      'Shapley value settlement',
      'Dedicated vector DB',
      'Custom PTDF topologies',
      'Self-hosted deployment',
    ],
    cta: 'Contact sales',
    featured: false,
    contactLink: true,
  },
] as const;

const FEATURE_MATRIX_COLS = ['Feature', 'Community', 'Pro', 'Grid Operator'];
const FEATURE_MATRIX_ROWS = [
  ['L2 Order Book',     '✓', '✓', '✓'],
  ['10 Hz Feed',        '✓', '✓', '✓'],
  ['GLFT Tuning',       '—', '✓', '✓'],
  ['API Access',        '—', '✓', '✓'],
  ['Rainflow Analytics','—', '✓', '✓'],
  ['DC-OPF Solver',     '—', '—', '✓'],
  ['Shapley Settlement','—', '—', '✓'],
  ['Self-Hosted',       '—', '—', '✓'],
];

const FAQ = [
  { q: 'Is there a free trial?', a: 'Community Node is permanently free. Pro includes a 14-day trial; no credit card required.' },
  { q: 'How does 10 Hz pricing work?', a: 'The GLFT market maker updates bid/ask quotes 10 times per second using current battery SoC, volatility, and order book state. No ML — pure physics.' },
  { q: 'What is Rainflow degradation pricing?', a: 'Each trade surcharges the ask by the marginal battery wear cost, computed from streaming DoD using the Wöhler fatigue curve.' },
  { q: 'Can I run this on my own hardware?', a: 'Grid Operator tier includes self-hosted deployment. Contact us for hardware requirements and licensing.' },
] as const;

export default function PricingPage() {
  const openAuth = useStore((s) => s.openAuth);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">

      {/* Hero statement */}
      <div className="mb-16">
        <SectionLabel n="01">Pricing</SectionLabel>
        <div className="mt-10">
          <Statement title={<>Scale your energy alpha.<br />Choose your node.</>}>
            From prosumer to grid operator — one platform, three tiers, zero ML in the pricing path.
          </Statement>
        </div>
      </div>

      {/* Tier columns */}
      <Hairline className="mb-10" />
      <div className="grid gap-6 md:grid-cols-3">
        {TIERS.map((tier) => (
          <Reveal key={tier.name}>
            <div
              className={`flex h-full flex-col rounded-2xl border p-6 ${
                tier.featured
                  ? 'border-telemetry/50 bg-telemetry/5'
                  : 'border-edge/40 bg-slate-900/40'
              }`}
            >
              {tier.featured && (
                <p className="mb-3 label-caps text-telemetry">Most popular</p>
              )}
              <div className="mb-4">
                <h2 className="font-display text-xl font-bold text-white">{tier.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{tier.sub}</p>
              </div>
              <p className="mb-6 font-mono text-3xl font-bold tabular-nums text-white">{tier.price}</p>
              <ul className="mb-8 flex flex-1 flex-col gap-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              {tier.contactLink ? (
                <Link href="/contact" className="btn-ghost text-center">
                  {tier.cta} <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth('signup')}
                  className={tier.featured ? 'btn-brand' : 'btn-ghost'}
                >
                  {tier.cta} <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </Reveal>
        ))}
      </div>

      {/* Feature matrix */}
      <div className="mt-16">
        <SectionLabel n="02">Feature matrix</SectionLabel>
        <div className="mt-6">
          <DataTable
            columns={FEATURE_MATRIX_COLS}
            rows={FEATURE_MATRIX_ROWS}
          />
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <SectionLabel n="03">FAQ</SectionLabel>
        <div className="mt-6 divide-y divide-edge/40 border-y border-edge/40">
          {FAQ.map((item, i) => (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-display text-lg font-bold text-white">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {openFaq === i && (
                <p className="pb-6 pr-10 text-slate-400">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
