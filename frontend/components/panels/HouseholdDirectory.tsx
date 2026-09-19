'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/live/session';
import { Check, X, Shield, Users, Clock, Mail, MapPin } from 'lucide-react';

interface DirectoryUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  area_code: string;
  created_at: number;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string; pulse?: boolean }> = {
  approved: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    label: 'APPROVED',
  },
  pending: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    label: 'PENDING',
    pulse: true,
  },
  rejected: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400/70',
    border: 'border-rose-500/30',
    label: 'REJECTED',
  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES['pending'];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${s.bg} ${s.text} ${s.border} ${s.pulse ? 'animate-pulse' : ''}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === 'approved' ? 'bg-emerald-400' : status === 'pending' ? 'bg-amber-400' : 'bg-rose-400/60'
        }`}
        aria-hidden="true"
      />
      {s.label}
    </span>
  );
}

export function HouseholdDirectory() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ userId: string; tone: 'ok' | 'err'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiFetch<DirectoryUser[]>('/api/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch household directory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const handleApprove = async (userId: string) => {
    setBusy(userId);
    setFeedback(null);
    try {
      await apiFetch('/api/admin/approve-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      setFeedback({ userId, tone: 'ok', text: 'Approved' });
      await fetchUsers();
    } catch (err) {
      setFeedback({ userId, tone: 'err', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    setBusy(userId);
    setFeedback(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/revoke`, {
        method: 'POST',
      });
      setFeedback({ userId, tone: 'ok', text: 'Revoked' });
      await fetchUsers();
    } catch (err) {
      setFeedback({ userId, tone: 'err', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 font-mono text-xs">
        <span className="animate-pulse">Loading household directory…</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-xs">
        <Users className="w-10 h-10 mb-3 opacity-40" />
        <p>No registered households in your area.</p>
      </div>
    );
  }

  const counts = {
    total: users.length,
    approved: users.filter((u) => u.status === 'approved').length,
    pending: users.filter((u) => u.status === 'pending').length,
    rejected: users.filter((u) => u.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-edge/40 bg-slate-800/40 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Total</p>
          <p className="text-xl font-semibold tabular-nums text-slate-100">{counts.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-500/70">Approved</p>
          <p className="text-xl font-semibold tabular-nums text-emerald-400">{counts.approved}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-500/70">Pending</p>
          <p className="text-xl font-semibold tabular-nums text-amber-400">{counts.pending}</p>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
          <p className="text-[10px] font-mono uppercase tracking-wider text-rose-500/50">Rejected</p>
          <p className="text-xl font-semibold tabular-nums text-rose-400/70">{counts.rejected}</p>
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto rounded-lg border border-edge/30">
        <table className="w-full text-left text-sm font-mono text-slate-400">
          <thead className="bg-slate-900/60 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Name
                </span>
              </th>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Email
                </span>
              </th>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Area Code
                </span>
              </th>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Status
                </span>
              </th>
              <th className="px-4 py-3 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Registered
                </span>
              </th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {users.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-slate-800/20">
                <td className="px-4 py-3 text-slate-100 font-semibold truncate max-w-[160px]">
                  {u.name || '\u2014'}
                </td>
                <td className="px-4 py-3 text-slate-300 truncate max-w-[200px]">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-800/60 border border-edge/30 px-2 py-0.5 text-[11px] font-mono tabular-nums text-violet-300">
                    {u.area_code || '\u2014'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-4 py-3 tabular-nums text-[11px] text-slate-500">
                  {u.created_at ? new Date(u.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '\u2014'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {feedback?.userId === u.id && (
                      <span
                        className={`text-[10px] font-mono ${
                          feedback.tone === 'ok' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {feedback.text}
                      </span>
                    )}
                    {(u.status === 'pending' || u.status === 'rejected') && (
                      <button
                        onClick={() => handleApprove(u.id)}
                        disabled={busy === u.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                    )}
                    {u.status === 'approved' && (
                      <button
                        onClick={() => handleRevoke(u.id)}
                        disabled={busy === u.id}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Revoke
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
