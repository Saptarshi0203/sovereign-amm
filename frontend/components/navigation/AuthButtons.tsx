'use client';

import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { ChevronDown, LogOut, ShieldCheck, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuthStore } from '@/store/authStore';
import { loginWithGoogle, signOut } from '@/lib/live/session';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function inr(v: number): string {
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Navbar auth area.
 *
 * Logged out → `DEMO MODE` badge + the Google `<GoogleLogin>` button. On
 *   success the ID token goes to POST /api/auth/google; the returned JWT and
 *   user land in the persisted auth store (and the app store switches from the
 *   Demo Sandbox to the live feed). Falls back to the classic "Sign In" drawer
 *   when no NEXT_PUBLIC_GOOGLE_CLIENT_ID is configured.
 *
 * Logged in → avatar, live wallet balance, ADMIN tag, and a dropdown with
 *   "Log Out".
 */
export function AuthButtons() {
  const openAuth = useStore((s) => s.openAuth);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const user = useAuthStore((s) => s.user);
  const livePortfolio = useStore((s) => s.portfolio);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (isLoggedIn && user) {
    const wallet = livePortfolio && livePortfolio.role !== 'demo' ? livePortfolio.wallet_balance_inr : (user.wallet_balance ?? user.wallet_balance_inr ?? 0);
    const initials = (user.name || user.email).slice(0, 1).toUpperCase();
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
        >
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center">{initials}</span>
          )}
          <span className="hidden lg:flex flex-col items-start leading-tight">
            <span className="text-xs text-slate-200 max-w-[140px] truncate">{user.name || user.email}</span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              <Wallet className="inline w-3 h-3 mr-0.5 -mt-0.5" />
              {inr(wallet)}
            </span>
          </span>
          {isAdmin && <span className="text-[10px] font-mono text-violet-700 dark:text-violet-300 border border-violet-700/50 rounded px-1 py-0.5">ADMIN</span>}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-900 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-sm text-white truncate">{user.name || '—'}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Paper wallet</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{inr(wallet)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500">Role</span>
                <span className={isAdmin ? 'text-violet-700 dark:text-violet-300' : 'text-slate-300'}>
                  {isAdmin && <ShieldCheck className="inline w-3 h-3 mr-1 -mt-0.5" />}
                  {user.role}
                </span>
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="w-4 h-4" /> Log Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-700/40 rounded-md px-2 py-1 whitespace-nowrap"
        title="Demo Sandbox — fully interactive on the 24 h demo stream with a ₹1,00,000 paper wallet. Sign in for your live regional feed and personal wallet."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        DEMO MODE
      </span>
      {GOOGLE_CLIENT_ID ? (
        <div className="flex flex-col items-end">
          <GoogleLogin
            onSuccess={async (cred) => {
              setError(null);
              try {
                if (!cred.credential) throw new Error('No credential returned by Google');
                await loginWithGoogle(cred.credential);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Google sign-in failed');
              }
            }}
            onError={() => setError('Google sign-in failed')}
            theme="filled_black"
            shape="pill"
            size="medium"
            text="signin_with"
            useOneTap={false}
          />
          {error && <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono mt-0.5">{error}</span>}
        </div>
      ) : (
        <button
          onClick={() => openAuth('signin')}
          className="px-3 py-2 text-sm font-medium text-slate-300 border border-slate-600 rounded-md hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
        >
          Sign In
        </button>
      )}
    </div>
  );
}

export default AuthButtons;
