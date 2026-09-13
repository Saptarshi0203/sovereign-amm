'use client';
import { Lock } from 'lucide-react';
import { useStore } from '@/lib/store';

interface LockOverlayProps {
  title: string;
  body: string;
  ctaLabel: string;
  children: React.ReactNode;
}

/**
 * Gates premium panels behind a session. Any session — a Guest Demo Session
 * (auto-started for presentations) or a real sign-in — renders the children
 * directly with no blur, no overlay and full pointer events. Until the session
 * bootstrap has run we render the children un-gated as well, so SSR/hydration
 * never paints a lock that immediately disappears.
 */
export function LockOverlay({ title, body, ctaLabel, children }: LockOverlayProps) {
  const openAuth = useStore((s) => s.openAuth);
  const isUnlocked = useStore((s) => s.isUnlocked);
  const sessionReady = useStore((s) => s.sessionReady);

  if (isUnlocked || !sessionReady) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Children render at z-0 — animations continue underneath */}
      <div className="relative z-0 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      {/* Overlay at z-10 — backdrop-blur on overlay, NOT filter on children */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-md bg-slate-950/40">
        <Lock className="w-8 h-8 text-slate-400 mb-3" aria-hidden="true" />
        <p className="text-white font-semibold text-lg mb-1 text-center px-4">{title}</p>
        <p className="text-slate-400 text-sm mb-5 text-center max-w-xs px-4">{body}</p>
        <button
          onClick={() => openAuth('signin')}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors duration-200"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default LockOverlay;
