'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useStore } from '@/lib/store';

/**
 * Hard gate for admin-only routes. Renders nothing until the session has
 * bootstrapped, then either the children (admin JWT in the store) or a 403
 * panel with a sign-in prompt. Server-side the same endpoints are guarded by
 * `require_admin`, so this is UX, not the security boundary.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const sessionReady = useStore((s) => s.sessionReady);
  const isAdmin = useStore((s) => s.isAdmin);
  const authState = useStore((s) => s.authState);
  const openAuth = useStore((s) => s.openAuth);

  if (!sessionReady) return null;
  if (isAdmin) return <>{children}</>;

  return (
    <main className="max-w-xl mx-auto px-4 py-24 text-center">
      <ShieldAlert className="w-10 h-10 mx-auto text-rose-400 mb-4" />
      <h1 className="text-2xl font-bold text-white mb-2">Admin access required</h1>
      <p className="text-sm text-slate-400 mb-6">
        The Control Room (live data feed upload, grid injections, scenarios) is restricted to administrator accounts.
        {authState === 'anonymous' ? ' Sign in with an admin account to continue.' : ' Your account does not have the admin role.'}
      </p>
      <div className="flex justify-center gap-3">
        {authState === 'anonymous' && (
          <button onClick={() => openAuth('signin')} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">
            Sign In
          </button>
        )}
        <Link href="/dashboard" className="px-5 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:text-white">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

export default AdminGate;
