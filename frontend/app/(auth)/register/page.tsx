'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';
      const res = await fetch(`${apiBase}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        throw new Error((body?.detail as string) ?? `Registration failed (HTTP ${res.status})`);
      }
      router.push('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
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
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Join the energy trading platform</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6">

          {error && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="label-caps">Email address</label>
              <input
                id="email" type="email" autoComplete="email" required disabled={loading}
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="label-caps">Password</label>
              <input
                id="password" type="password" autoComplete="new-password" required disabled={loading}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="label-caps">Confirm password</label>
              <input
                id="confirm-password" type="password" autoComplete="new-password" required disabled={loading}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-xl border border-edge/60 bg-slate-800/60 px-3 py-2.5 font-mono text-sm text-white placeholder-slate-500 transition-colors focus:border-telemetry/60 focus:outline-none focus:ring-1 focus:ring-telemetry/40 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password || !confirmPassword}
              className="btn-brand mt-1 w-full disabled:opacity-50"
            >
              {loading ? 'Creating account…' : (
                <>Sign up <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="hairline mt-5" aria-hidden="true" />
          <p className="mt-4 text-center font-mono text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-telemetry hover:underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
