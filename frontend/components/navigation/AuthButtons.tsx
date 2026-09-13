'use client';

import { useStore } from '@/lib/store';
import { signOut } from '@/lib/live/session';

/**
 * AuthButtons — rendered in the Navbar.
 *
 * - Guest Demo Session → "DEMO MODE" badge + "Sign In" (opens the drawer, so
 *   Google OAuth / password sign-in stays one click away during a demo).
 * - Real session → e-mail + "Sign Out" (drops back to the demo session).
 * - No session → "Sign In" / "Sign Up Now".
 */
export function AuthButtons() {
  const openAuth = useStore((s) => s.openAuth);
  const demoUser = useStore((s) => s.demoUser);
  const authUser = useStore((s) => s.authUser);
  const jwtToken = useStore((s) => s.jwtToken);
  const isReal = !demoUser && jwtToken !== null;

  if (isReal) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-xs font-mono text-slate-400 max-w-[180px] truncate" title={authUser?.email}>
          {authUser?.name || authUser?.email}
        </span>
        <button
          onClick={() => void signOut()}
          className="px-3 py-2 text-sm font-medium text-slate-300 border border-slate-600 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {demoUser && (
        <span
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-700/40 rounded-md px-2 py-1 whitespace-nowrap"
          title="Guest Demo Session — all panels unlocked"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          DEMO MODE
        </span>
      )}
      <button
        onClick={() => openAuth('signin')}
        className="px-3 py-2 text-sm font-medium text-slate-300 border border-slate-600 rounded-md hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
      >
        Sign In
      </button>
      {!demoUser && (
        <button
          onClick={() => openAuth('signup')}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
        >
          Sign Up Now
        </button>
      )}
    </div>
  );
}

export default AuthButtons;
