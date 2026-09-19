'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogle, loginWithPassword, apiFetch } from '@/lib/live/session';

export function AuthDrawer(): React.ReactElement {
  const authDrawerOpen = useStore((s) => s.authDrawerOpen);
  const authMode = useStore((s) => s.authMode);
  const closeAuth = useStore((s) => s.closeAuth);
  const openAuth = useStore((s) => s.openAuth);

  const drawerRef = useRef<HTMLDivElement>(null);

  // — Body scroll lock —
  useEffect(() => {
    if (authDrawerOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [authDrawerOpen]);

  // — Escape key close —
  useEffect(() => {
    if (!authDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuth();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [authDrawerOpen, closeAuth]);

  // — Focus trap —
  useEffect(() => {
    if (!authDrawerOpen || !drawerRef.current) return;
    const FOCUSABLE =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', trap);
    first?.focus();
    return () => document.removeEventListener('keydown', trap);
  }, [authDrawerOpen]);

  if (!authDrawerOpen) {
    return <></>;
  }

  return (
    // Outer: full viewport overlay
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={authMode === 'signin' ? 'Sign In' : 'Create Account'}
    >
      {/* Scrim */}
      <div
        className="flex-1 bg-black/60"
        onClick={closeAuth}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="w-full sm:w-[420px] h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {authMode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={closeAuth}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 flex flex-col gap-6">
          {authMode === 'signin' ? (
            <SignInForm onSuccess={closeAuth} />
          ) : (
            <SignUpForm onSuccess={closeAuth} />
          )}

          {/* Toggle mode */}
          <p className="text-sm text-slate-400 text-center">
            {authMode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => openAuth('signup')}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Sign Up Now
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => openAuth('signin')}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Sign In
                </button>
              </>
            )}
          </p>

          {/* Google button */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center w-full gap-3 mb-2">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                try {
                  if (!credentialResponse.credential) throw new Error('No credential returned by Google');
                  await loginWithGoogle(credentialResponse.credential);
                  closeAuth();
                } catch (err) {
                  console.error('[auth] Google sign-in failed:', err);
                }
              }}
              onError={() => console.error('Google Login Failed')}
              theme="filled_black"
              shape="rectangular"
              text="continue_with"
            />
            <button
              type="button"
              onClick={closeAuth}
              className="mt-3 text-xs text-slate-400 hover:text-emerald-400 underline underline-offset-2"
            >
              Keep browsing in Demo Mode (static data, no trading)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// — Sign In form —
function SignInForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginWithPassword(email, password);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      if (msg.includes('AWAITING_APPROVAL')) {
        localStorage.setItem('pending_email', email);
        router.push('/waiting-room');
        onSuccess(); // Close drawer
      } else {
        setError(/fetch|network|Failed/i.test(msg) ? 'Backend unreachable — try again in a moment' : msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-mono">{error}</p>}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs text-slate-400 uppercase tracking-wider"
          htmlFor="signin-email"
        >
          Email
        </label>
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs text-slate-400 uppercase tracking-wider"
          htmlFor="signin-password"
        >
          Password
        </label>
        <input
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors mt-2"
      >
        {busy ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}

// — Sign Up form —
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState<'admin' | 'retailer'>('retailer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [areaCode, setAreaCode] = useState('');

  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password, 
          consumer_no: name,
          role,
          area_code: role === 'retailer' ? areaCode : undefined
        }),
        headers: { Authorization: '' },
      });
      if (role === 'admin') {
        setStatus('Account created and approved! You may now sign in.');
      } else {
        setStatus('Account created — your Grid Operator must approve it before you can sign in. Until then the site stays in Demo Mode.');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Signup failed.');
    }
    setTimeout(onSuccess, 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {status && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">{status}</p>}
      
      {/* Role Toggle */}
      <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
        <button
          type="button"
          onClick={() => setRole('retailer')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            role === 'retailer' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          Household Retailer
        </button>
        <button
          type="button"
          onClick={() => setRole('admin')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            role === 'admin' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          Grid Admin
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs text-slate-400 uppercase tracking-wider"
          htmlFor="signup-name"
        >
          Full Name
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs text-slate-400 uppercase tracking-wider"
          htmlFor="signup-email"
        >
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          className="text-xs text-slate-400 uppercase tracking-wider"
          htmlFor="signup-password"
        >
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>
      {role === 'retailer' && (
        <div className="flex flex-col gap-1.5 animate-slide-in-right">
          <label
            className="text-xs text-slate-400 uppercase tracking-wider"
            htmlFor="signup-area-code"
          >
            Admin Area Code
          </label>
          <input
            id="signup-area-code"
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.toUpperCase())}
            placeholder="KOL-2026"
            required
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
          />
        </div>
      )}
      <button
        type="submit"
        className="btn-brand w-full mt-2"
      >
        Create Account
      </button>
    </form>
  );
}

export default AuthDrawer;
