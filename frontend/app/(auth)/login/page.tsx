'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginWithPassword } from '@/lib/live/session';
import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="mb-8 text-center">
          <p className="label-caps mb-2">Sovereign-AMM</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Access the live trading dashboard</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">

          {/* Error alert */}
          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="label-caps">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="label-caps">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40 disabled:opacity-50"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-brand mt-1 w-full disabled:opacity-50"
            >
              {loading ? 'Signing in…' : (
                <>Sign in <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          {/* Hairline + footer */}
          <div className="hairline mt-5" aria-hidden="true" />
          <p className="mt-4 text-center font-mono text-xs text-slate-500">
            No account?{' '}
            <Link href="/register" className="text-telemetry hover:underline underline-offset-4">
              Sign up
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] text-slate-600">
          Demo mode is available on{' '}
          <Link href="/dashboard" className="text-slate-400 hover:text-white underline underline-offset-4">
            the dashboard
          </Link>{' '}
          without signing in.
        </p>
      </div>
    </div>
  );
}
