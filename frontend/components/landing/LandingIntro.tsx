'use client';

/**
 * @file LandingIntro.tsx
 * @description SEDA-style full-screen burst intro overlay.
 *
 * Fires unconditionally on EVERY page load — no sessionStorage gate.
 * State machine:
 *   IDLE → VISIBLE (mount, if reduced-motion inactive)
 *   VISIBLE → DISMISSABLE (after 1500 ms)
 *   DISMISSABLE → GONE (keydown / pointerdown)
 *   VISIBLE | DISMISSABLE → GONE (3200 ms hard timeout)
 *   GONE → returns null
 *
 * Under `prefers-reduced-motion: reduce` returns null immediately.
 * Hard-unmounts at 3.2 s regardless of animation state.
 * Dismissable by keydown or pointerdown after 1.5 s.
 *
 * Requirements: 4.1–4.12, 10.2, 10.5, 12.3
 */

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { setIntroActive } from '@/lib/introState';
import { LANDING_BURST_CONFIG } from '@/components/landing/particleConfigs';

// Load ParticleCanvas on the client only — never on the server (Req 12.1).
const DynamicParticleCanvas = dynamic(
  () => import('@/components/ui/ParticleCanvas').then((m) => m.ParticleCanvas),
  { ssr: false },
);

const TOKENS = ['10 Hz', 'GLFT', 'PTDF', 'SoC', 'L2', 'MW', 'kWh', 'BID', 'ASK'];
const POS = [
  'left-[6%] top-[12%]',
  'right-[8%] top-[14%]',
  'left-[10%] top-[48%]',
  'right-[6%] top-[50%]',
  'left-[8%] bottom-[14%]',
  'right-[10%] bottom-[12%]',
  'left-[38%] top-[8%]',
  'right-[36%] bottom-[8%]',
  'left-[50%] bottom-[16%]',
];

export function LandingIntro() {
  const [show, setShow] = useState(false);
  const [dismissable, setDismissable] = useState(false);
  // Ref guards against calling setIntroActive(false) twice on double-unmount.
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Req 4.11 / 10.2: return null if reduced-motion is active.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    setShow(true);
    setIntroActive(true); // Req 4.12

    const armedTimer = setTimeout(() => setDismissable(true), 1500);
    const hardTimer = setTimeout(() => {
      if (!dismissedRef.current) {
        dismissedRef.current = true;
        setShow(false);
        setIntroActive(false); // Req 4.12
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 3200);

    return () => {
      clearTimeout(armedTimer);
      clearTimeout(hardTimer);
      // Cleanup on unmount (e.g. hot-reload) — Req 4.12.
      if (!dismissedRef.current) {
        setIntroActive(false);
      }
    };
  }, []);

  // Req 4.10: dismiss on keydown / pointerdown after 1.5 s.
  useEffect(() => {
    if (!show || !dismissable) return;
    const dismiss = () => {
      if (dismissedRef.current) return;
      dismissedRef.current = true;
      setShow(false);
      setIntroActive(false); // Req 4.12
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('keydown', dismiss);
    window.addEventListener('pointerdown', dismiss);
    return () => {
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('pointerdown', dismiss);
    };
  }, [show, dismissable]);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="fixed inset-0 z-[100] overflow-hidden text-[#edf1f7] [pointer-events:none]"
      style={{ height: '100dvh' }}
    >
      {/* Two mask halves that split apart on exit via CSS animations */}
      <div className="intro-half-top absolute inset-x-0 top-0 h-1/2 bg-[#07090f]" />
      <div className="intro-half-bottom absolute inset-x-0 bottom-0 h-1/2 bg-[#07090f]" />

      <div className="intro-content absolute inset-0">
        {/* Req 4.4 / 4.5: tsparticles starburst burst — aria-hidden, ssr:false */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
          <DynamicParticleCanvas
            id="landing-burst"
            config={LANDING_BURST_CONFIG}
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* Dot-grid overlay */}
        <div className="intro-grid absolute inset-0 z-[1] [background-image:radial-gradient(circle,#edf1f7_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

        {/* Horizontal hairline */}
        <div className="intro-line absolute left-[8%] right-[8%] top-1/2 h-px bg-white/15 z-[1]" />

        {/* Floating token labels */}
        {TOKENS.map((t, i) => (
          <span
            key={t}
            className={`intro-token absolute font-mono text-[11px] tracking-[.22em] z-[1] ${POS[i]}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {t}
          </span>
        ))}

        {/* SVG line traces */}
        <svg
          className="absolute inset-0 h-full w-full z-[1]"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="#00e5ff" strokeOpacity=".55" strokeWidth="1">
            <path className="intro-dash" d="M0 120 L520 420 L800 450" />
            <path className="intro-dash" d="M1600 140 L1080 430 L800 450" />
            <path className="intro-dash" d="M0 780 L540 480 L800 450" />
            <path className="intro-dash" d="M1600 760 L1060 470 L800 450" />
          </g>
          <g stroke="#edf1f7" strokeOpacity=".12" strokeWidth="1">
            <path
              className="intro-dash"
              d="M800 250 L640 340 L640 560 L800 650 L960 560 L960 340 Z M800 250 L800 450 M640 340 L960 560 M960 340 L640 560"
            />
          </g>
        </svg>

        {/* Centred text content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center z-[2]">
          {/* Req 4.6: Aldrich heading with SEDA gradient — #edf1f7 → #a855f7 → #6366f1 */}
          <h1
            className="intro-word font-display font-extrabold leading-none"
            style={{
              fontSize: 'clamp(1.75rem, 6vw, 5rem)',
              backgroundImage: 'linear-gradient(135deg, #edf1f7 0%, #a855f7 55%, #6366f1 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SOVEREIGN-AMM
          </h1>

          {/* Req 4.7: sub-line in font-mono with pulsing emerald dot */}
          <p className="intro-sub mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-[.3em] sm:text-xs">
            <span className="intro-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            10 Hz MATCHING ENGINE • LIVE
          </p>

          <p className="intro-tag mt-10 font-mono text-[10px] tracking-[.35em] text-white/60 sm:text-[11px]">
            DETERMINISTIC ENERGY MARKETS · POWERED BY GRID PHYSICS
          </p>
        </div>
      </div>
    </div>
  );
}

export default LandingIntro;
