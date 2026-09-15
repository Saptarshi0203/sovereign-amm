'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Hero } from '@/components/landing/Hero';
import { LandingIntro } from '@/components/landing/LandingIntro';
import { RecentArticles } from '@/components/landing/RecentArticles';
import { Showcase } from '@/components/landing/Showcase';
import { SplitPreview } from '@/components/landing/SplitPreview';
import { SystemBlueprint } from '@/components/landing/SystemBlueprint';
import { Marquee, NumberedList, SectionLabel, Statement, Timeline, Reveal } from '@/components/ui/Editorial';
import { isIntroActive } from '@/lib/introState';

// Heavy components loaded client-side only to avoid SSR/hydration issues
const TerminalCarousel = dynamic(() => import('@/components/landing/TerminalCarousel').then((m) => m.TerminalCarousel), { ssr: false });
const RagCopilot = dynamic(() => import('@/components/landing/RagCopilot').then((m) => m.RagCopilot), { ssr: false });
const SystemCardsGrid = dynamic(() => import('@/components/landing/SystemCardsGrid').then((m) => m.SystemCardsGrid), { ssr: false });

const MANIFESTO = 'Connecting physics with price, batteries with markets, households with the grid — we make every kilowatt-hour clear at the price the wires allow.';

const ISSUES = [
  { title: 'Energy is priced without the wires', body: 'Flat tariffs ignore where power actually flows, so congestion is invisible until a line trips.' },
  { title: 'Batteries trade blind to their own wear', body: 'Every deep cycle costs real money, yet most dispatch never charges the ask for it.' },
  { title: 'Order flow and grid physics live in different systems', body: 'A match that clears in the market can be impossible on the network.' },
  { title: 'Nobody can replay what happened', body: 'When the numbers are questioned there is no bit-exact ledger to rerun.' },
];

const STEPS = [
  { label: 'Step 01', title: 'Ingest', body: 'Household orders and the 10-second dataset arrive at the 10 Hz engine, clock-synced to IST.' },
  { label: 'Step 02', title: 'Quote', body: 'The community battery quotes with the GLFT model, skewing bid and ask by its state-of-charge.' },
  { label: 'Step 03', title: 'Screen', body: 'Every prospective fill is projected through the PTDF matrix; anything that overloads a line is rejected.' },
  { label: 'Step 04', title: 'Settle', body: 'Fills post to the event-sourced ledger in integer micro-units and update wallets, inventory and PnL.' },
  { label: 'Step 05', title: 'Learn', body: 'Rainflow counting turns the SoC trace into a wear surcharge that feeds the next quote.' },
];

const FAQ = [
  { q: 'Can I trade without signing in?', a: 'Yes. The Demo Sandbox is fully interactive on the public 24 h stream with a local ₹1,00,000 paper wallet.' },
  { q: 'What changes when I sign in with Google?', a: 'Your sockets connect to your regional grid, trades settle against a server-side wallet, and admins unlock the Control tab.' },
  { q: 'Why was my order rejected?', a: 'Most rejections are PTDF screens: the fill would have pushed a transmission line past its 90 % safety margin.' },
  { q: 'Where does the price come from?', a: 'The micro-price is the volume-weighted mid of the L2 book, smoothed with an EWMA, and the AMM re-quotes around it every 100 ms.' },
  { q: 'Can I bring my own dataset?', a: 'Upload a 10-second CSV from the Dataset drawer; playback follows wall-clock IST through it.' },
  { q: 'How is battery wear priced?', a: 'A streaming Rainflow counter measures depth of discharge and prices the marginal kWh with a Wöhler cycle-life curve.' },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-edge/40 border-y border-edge/40">
      {FAQ.map((f, i) => (
        <div key={f.q}>
          <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-5 text-left">
            <span className="font-display text-lg font-bold text-white sm:text-xl">{f.q}</span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {open === i && <p className="pb-6 pr-10 text-slate-400">{f.a}</p>}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  // B1 FIX: Control scroll restoration while intro is active
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
    const wasAuto = window.history.scrollRestoration === 'auto';
    if (isIntroActive()) {
      window.history.scrollRestoration = 'manual';
      const check = setInterval(() => {
        if (!isIntroActive()) {
          window.history.scrollRestoration = 'auto';
          clearInterval(check);
        }
      }, 100);
      return () => {
        clearInterval(check);
        if (wasAuto) window.history.scrollRestoration = 'auto';
      };
    }
  }, []);

  return (
    <>
      <LandingIntro />

      {/* 00 Hero */}
      <Hero />
      <Marquee text={MANIFESTO} />

      {/* 01 — ISSUE */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionLabel n="01">Issue</SectionLabel>
        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Statement title={<>The faster energy moves, <br className="hidden sm:block" />the more the physics matters.</>}>
              Markets clear in milliseconds. Wires do not care. A price that ignores the network is a promise the grid cannot keep.
            </Statement>
          </div>
          <div className="lg:col-span-7">
            <NumberedList items={ISSUES} />
          </div>
        </div>
      </section>

      {/* 02 — SYSTEM BLUEPRINT */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10">
        <SectionLabel n="02">System blueprint</SectionLabel>
        <SystemBlueprint />
      </section>

      {/* 03 — TERMINALS */}
      <section className="mx-auto max-w-[1600px] px-4 pt-12 sm:px-6 lg:px-10">
        <SectionLabel n="03">Terminals</SectionLabel>
      </section>
      <SplitPreview />
      <Showcase />

      {/* 04 — LIVE */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10">
        <SectionLabel n="04">Live</SectionLabel>
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_400px]">
          <TerminalCarousel />
          <aside className="flex flex-col gap-6">
            <div className="glass rounded-2xl p-5">
              <RecentArticles />
            </div>
            <div className="glass rounded-2xl p-5">
              <RagCopilot />
            </div>
          </aside>
        </div>
        <div className="mt-10">
          <p className="label-caps mb-4">Engine telemetry</p>
          <SystemCardsGrid />
        </div>
      </section>

      {/* 05 — PROCESS */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionLabel n="05">Process</SectionLabel>
        <div className="mt-12 grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Statement title="Ingest. Quote. Screen. Settle. Learn." className="mb-14">
              Every tick runs through these five steps, deterministically, ten times a second.
            </Statement>
            <Timeline steps={STEPS} />
          </div>
          <div className="lg:col-span-5">
            <Reveal className="border-t border-edge/60 pt-6">
              <p className="label-caps mb-6">How the engine behaves</p>
              <ul className="space-y-5 text-slate-300">
                {[
                  'Integer micro-units everywhere, so replay is bit-exact',
                  'One 10 Hz loop per grid; every client sees the same snapshot',
                  'PTDF screening before a fill, never after',
                  'Battery wear is a cost in the ask, not a footnote',
                  'Every rejection is logged with the line that caused it',
                ].map((t) => (
                  <li key={t} className="flex gap-4">
                    <span className="text-slate-600" aria-hidden="true">—</span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 06 — FAQ */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <SectionLabel n="06">FAQ</SectionLabel>
        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Statement title="The questions we're asked before the first trade.">Ask the Copilot anything else; it reads the live engine.</Statement>
          </div>
          <div className="lg:col-span-7">
            <Faq />
            <Link href="/copilot" className="btn-ghost mt-8 inline-flex">
              Ask the Copilot <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-edge/40">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:px-10">
          <h2 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Open the terminal. <span className="text-gradient">The market is already running.</span>
          </h2>
          <Link href="/dashboard" className="btn-brand">
            Open the terminal <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
