'use client';

/**
 * HeroSection — SEDA-style landing page hero with continuous tsparticles starburst.
 *
 * Converted to 'use client' to support dynamic() + useTheme().
 * Always-on particle starburst background; theme-aware dark/light configs.
 * Under prefers-reduced-motion: reduce, replaces ParticleCanvas with a static div.
 *
 * Requirements: 5.1–5.9, 10.3, 10.5, 11.3, 12.4
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { HERO_DARK_CONFIG, HERO_LIGHT_CONFIG } from '@/components/hero/particleConfigs';

// SSR-safe: never imported on server (Req 12.4)
const DynamicParticleCanvas = dynamic(
  () => import('@/components/ui/ParticleCanvas').then((m) => m.ParticleCanvas),
  { ssr: false },
);

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Req 10.3: check reduced-motion only on client, inside useEffect.
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Default to dark config before hydration (resolvedTheme may be undefined briefly).
  const particleConfig = resolvedTheme === 'light' ? HERO_LIGHT_CONFIG : HERO_DARK_CONFIG;

  return (
    <section
      // Req 5.8: dark canvas bg-[#000000] / light canvas bg-[#f8fafc]
      className="relative w-full overflow-hidden bg-[#000000] dark:bg-[#000000] light-scope:bg-[#f8fafc]"
      aria-label="Hero section"
    >
      {/* Req 5.2: particle canvas as absolute inset-0, pointer-events-none, z-0 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
      >
        {reducedMotion ? (
          // Req 10.3: static fallback under reduced-motion
          <div aria-hidden="true" className="absolute inset-0 bg-[#000000] dark:bg-[#000000]" />
        ) : (
          <DynamicParticleCanvas
            id="hero-starburst"
            config={particleConfig}
            className="absolute inset-0 w-full h-full"
          />
        )}
      </div>

      {/* Content sits above particles */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-semibold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          10 Hz Matching Engine · Live
        </div>

        {/*
          Req 5.5: Aldrich headline (font-display), responsive 3rem→5.5rem.
          "MARKETS" in Neon Violet #a855f7.
        */}
        <h1
          className="font-display font-extrabold leading-none mb-4 tracking-tight"
          style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
        >
          <span className="text-white dark:text-white">
            DETERMINISTIC ENERGY
          </span>
          <br />
          <span style={{ color: '#a855f7' }}>MARKETS</span>
        </h1>

        {/* Req 5.6: sub-headline in muted slate */}
        <p className="text-2xl sm:text-3xl font-semibold text-slate-300 dark:text-slate-300 mb-4">
          Powered by Grid Physics
        </p>

        {/* Descriptive paragraph */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sovereign-AMM is a high-frequency limit order book for microgrid energy
          markets. Our battery-based algorithmic market maker uses the{' '}
          <abbr title="Guéant–Lehalle–Fernandez-Tapia bounded-inventory model" className="no-underline">
            GLFT
          </abbr>{' '}
          model to price energy in real time — combining grid physics, rainflow
          degradation costs, and deterministic settlement.
        </p>

        {/* Req 5.7: preserve existing CTA links /register and /login */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <Link
            href="/register"
            className="btn-brand glow-hover min-w-[180px] text-lg"
          >
            Sign Up Now
          </Link>
          <Link
            href="/login"
            className="btn-ghost glow-hover min-w-[180px] text-lg"
          >
            Sign In
          </Link>
        </div>

        {/* Req 5.7: stats bar preserved */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 text-xs font-mono text-slate-500">
          <span className="px-4">10 Hz Update Rate</span>
          <span className="hidden sm:block w-px h-4 bg-slate-700" aria-hidden="true" />
          <span className="px-4">GLFT Pricing Model</span>
          <span className="hidden sm:block w-px h-4 bg-slate-700" aria-hidden="true" />
          <span className="px-4">ZK Solvency Ready</span>
        </div>
      </div>
    </section>
  );
}
