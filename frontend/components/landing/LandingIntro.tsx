'use client';

/**
 * @file LandingIntro.tsx
 * @description 2.5–3 s "system powering on" overlay for the landing page.
 *
 * A purely visual, fixed full-viewport layer: the page (sockets, auth, store)
 * initialises underneath. Shown once per browser session
 * (`sessionStorage` key `sovereign-intro-seen`), skipped under reduced motion,
 * hard-unmounted at 3.2 s no matter what, and dismissable by click/key after
 * 1.5 s. Only transform / opacity / clip-path / stroke-dashoffset animate.
 */

import { useEffect, useState } from 'react';
import { setIntroActive } from '@/lib/introState';

const KEY = 'sovereign-intro-seen';
const TOKENS = ['10 Hz', 'GLFT', 'PTDF', 'SoC', 'L2', 'MW', 'kWh', 'BID', 'ASK'];
const POS = ['left-[6%] top-[12%]', 'right-[8%] top-[14%]', 'left-[10%] top-[48%]', 'right-[6%] top-[50%]', 'left-[8%] bottom-[14%]', 'right-[10%] bottom-[12%]', 'left-[38%] top-[8%]', 'right-[36%] bottom-[8%]', 'left-[50%] bottom-[16%]'];

function shouldShow(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function LandingIntro() {
  const [show, setShow] = useState(false);
  const [dismissable, setDismissable] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;
    setShow(true);
    setIntroActive(true);
    const armed = setTimeout(() => setDismissable(true), 1500);
    const hard = setTimeout(() => {
      setShow(false);
      setIntroActive(false);
      // B1 FIX: Ensure scroll is at top when intro completes
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 3200);
    return () => {
      clearTimeout(armed);
      clearTimeout(hard);
      setIntroActive(false);
    };
  }, []);

  useEffect(() => {
    if (!show || !dismissable) return;
    const off = () => {
      setShow(false);
      setIntroActive(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('keydown', off);
    window.addEventListener('pointerdown', off);
    return () => {
      window.removeEventListener('keydown', off);
      window.removeEventListener('pointerdown', off);
    };
  }, [show, dismissable]);

  if (!show) return null;

  return (
    <div aria-hidden="true" role="presentation" className="fixed inset-0 z-[100] overflow-hidden text-[#edf1f7] [pointer-events:none]" style={{ height: '100dvh' }}>
      {/* two mask halves that split apart on exit */}
      <div className="intro-half-top absolute inset-x-0 top-0 h-1/2 bg-[#07090f]" />
      <div className="intro-half-bottom absolute inset-x-0 bottom-0 h-1/2 bg-[#07090f]" />

      <div className="intro-content absolute inset-0">
        <div className="intro-grid absolute inset-0 [background-image:radial-gradient(circle,#edf1f7_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="intro-line absolute left-[8%] right-[8%] top-1/2 h-px bg-white/15" />

        {TOKENS.map((t, i) => (
          <span key={t} className={`intro-token absolute font-mono text-[11px] tracking-[.22em] ${POS[i]}`} style={{ animationDelay: `${i * 40}ms` }}>
            {t}
          </span>
        ))}

        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" fill="none">
          <g stroke="#00e5ff" strokeOpacity=".55" strokeWidth="1">
            <path className="intro-dash" d="M0 120 L520 420 L800 450" />
            <path className="intro-dash" d="M1600 140 L1080 430 L800 450" />
            <path className="intro-dash" d="M0 780 L540 480 L800 450" />
            <path className="intro-dash" d="M1600 760 L1060 470 L800 450" />
          </g>
          <g stroke="#edf1f7" strokeOpacity=".12" strokeWidth="1">
            <path className="intro-dash" d="M800 250 L640 340 L640 560 L800 650 L960 560 L960 340 Z M800 250 L800 450 M640 340 L960 560 M960 340 L640 560" />
          </g>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <h1 className="intro-word font-display font-extrabold leading-none" style={{ fontSize: 'clamp(1.75rem, 6vw, 5rem)', backgroundImage: 'linear-gradient(135deg,#edf1f7 0%,#a78bfa 55%,#d946ef 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>
            SOVEREIGN-AMM
          </h1>
          <p className="intro-sub mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-[.3em] sm:text-xs">
            <span className="intro-pulse inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> 10 Hz MATCHING ENGINE • LIVE
          </p>
          <p className="intro-tag mt-10 font-mono text-[10px] tracking-[.35em] text-white/60 sm:text-[11px]">DETERMINISTIC ENERGY MARKETS · POWERED BY GRID PHYSICS</p>
        </div>
      </div>
    </div>
  );
}

export default LandingIntro;
