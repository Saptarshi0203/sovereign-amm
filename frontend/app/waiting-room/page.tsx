'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/live/session';
import { useStore } from '@/lib/store';
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function WaitingRoomPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [areaCode, setAreaCode] = useState<string>('...');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const openAuth = useStore(s => s.openAuth);

  useEffect(() => {
    const savedEmail = localStorage.getItem('pending_email');
    if (!savedEmail) {
      router.push('/');
      return;
    }
    setEmail(savedEmail);

    const checkStatus = async () => {
      try {
        const data = await apiFetch<{ status: string; area_code: string }>(`/api/auth/status?email=${encodeURIComponent(savedEmail)}`);
        setAreaCode(data.area_code || 'Unknown');
        
        if (data.status === 'approved') {
          setStatus('approved');
          // Clear pending email and prompt to login
          localStorage.removeItem('pending_email');
        } else if (data.status === 'rejected') {
          setStatus('rejected');
          localStorage.removeItem('pending_email');
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center animate-fade-in relative overflow-hidden">
        
        {/* Glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/10 blur-[64px] rounded-full pointer-events-none" />

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Clock className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-mono">Awaiting Approval</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your household account is currently under review by the Grid Operator for area <span className="text-emerald-400 font-mono font-bold">{areaCode}</span>.
            </p>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-500 mb-1">
                <span>Status</span>
                <span className="text-amber-400 animate-pulse">Reviewing</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Account</span>
                <span className="truncate max-w-[200px]">{email}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This page will automatically refresh when your account is approved.
            </p>
          </>
        )}

        {status === 'approved' && (
          <>
            <div className="w-16 h-16 bg-emerald-900/50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-mono">Access Granted</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your household account for area <span className="text-emerald-400 font-mono font-bold">{areaCode}</span> has been approved!
            </p>
            <button
              onClick={() => {
                router.push('/');
                openAuth('signin');
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
            >
              Log In Now
            </button>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className="w-16 h-16 bg-rose-900/50 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert className="w-8 h-8 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-mono">Application Rejected</h1>
            <p className="text-slate-400 text-sm mb-6">
              Your household account application was not approved by the Grid Operator.
            </p>
            <Link
              href="/"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-semibold transition-colors"
            >
              Return Home
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
