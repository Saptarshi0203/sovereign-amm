'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { GoogleLogin } from '@react-oauth/google';

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
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Sign Up Now
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => openAuth('signin')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
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
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const res = await fetch(`${apiUrl}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: credentialResponse.credential }),
                  });
                  if (!res.ok) throw new Error('Google auth failed on backend');
                  const data = await res.json();
                  
                  if (data.access_token) {
                    useStore.getState().setJwtToken(data.access_token);
                    localStorage.setItem('authToken', data.access_token);
                  }
                  useStore.setState({ demoUser: false });
                  closeAuth();
                } catch (err) {
                  console.error(err);
                }
              }}
              onError={() => console.error('Google Login Failed')}
              useOneTap
              theme="filled_black"
              shape="rectangular"
              text="continue_with"
            />
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    useStore.setState({ demoUser: true });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors mt-2"
      >
        Sign In
      </button>
    </form>
  );
}

// — Sign Up form —
function SignUpForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    useStore.setState({ demoUser: true });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <button
        type="submit"
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-colors mt-2"
      >
        Create Account
      </button>
    </form>
  );
}

export default AuthDrawer;
