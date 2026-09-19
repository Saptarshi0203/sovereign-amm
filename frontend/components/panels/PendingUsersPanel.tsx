'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/live/session';
import { Check, X, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface PendingUser {
  id: string;
  email: string;
  name: string;
  area_code: string;
  created_at: number;
}

export function PendingUsersPanel() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const authUser = useAuthStore((s: any) => s.user);

  const fetchUsers = async () => {
    try {
      const data = await apiFetch<PendingUser[]>('/api/admin/pending-users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (userId: string) => {
    setBusy(userId);
    try {
      await apiFetch(`/api/admin/approve-user`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      await fetchUsers();
    } catch (err) {
      console.error('Approval failed', err);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (userId: string) => {
    setBusy(userId);
    try {
      await apiFetch(`/api/admin/reject-user`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      await fetchUsers();
    } catch (err) {
      console.error('Rejection failed', err);
    } finally {
      setBusy(null);
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 font-mono text-xs">
        <User className="w-8 h-8 mb-2 opacity-50" />
        <p>No pending household requests.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4 px-4 pt-4">
        <span className="text-sm font-mono text-slate-400">
          Share your Area Code with local retailers: <strong className="text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">{(authUser as any)?.area_code || 'Unknown'}</strong>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm font-mono text-slate-400">
        <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Request Time</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 text-white truncate max-w-[200px]">{u.email}</td>
              <td className="px-4 py-3 tabular-nums">
                {new Date(u.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleReject(u.id)}
                  disabled={busy === u.id}
                  className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                  aria-label="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleApprove(u.id)}
                  disabled={busy === u.id}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
