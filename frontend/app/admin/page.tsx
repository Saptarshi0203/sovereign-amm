'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/live/session';
import { AdminGate } from '@/components/layout/AdminGate';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { EmptyState } from '@/components/ui/EmptyState';

interface AdminUser {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  role: string;
  sanctioned_load_kw: number;
  solar_kwp: number;
  assigned_bus_id: number | null;
}

const ROLES = ['admin', 'grid_operator', 'battery_operator', 'market_participant', 'viewer'] as const;

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
      if (!res.ok) throw new Error('Failed to fetch users');
      setUsers(await res.json() as AdminUser[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchUsers(); }, []);

  const handleApprove = async (userId: string) => {
    const busIdStr = prompt('Assign to Grid Bus ID (e.g. 1, 2):', '1');
    if (!busIdStr) return;
    await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_bus_id: parseInt(busIdStr, 10) }),
    });
    void fetchUsers();
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Reject this user?')) return;
    await fetch(`${API_BASE}/api/admin/users/${userId}/reject`, { method: 'POST' });
    void fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    void fetchUsers();
  };

  const STATUS_STYLES: Record<AdminUser['status'], string> = {
    approved: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    pending:  'border-warn/40 bg-warn/10 text-warn',
    rejected: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };

  return (
    <AdminGate>
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="Admin"
          title="Admin Dashboard"
          subtitle="Manage users · approve sign-ups · assign roles and grid buses"
        >
          <button
            type="button"
            onClick={() => void fetchUsers()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-edge/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-400 hover:border-white/50 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </PageHeader>

        <div className="mt-8">
          <TerminalPanel label="01 — USER MANAGEMENT">
            {error && (
              <div role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 font-mono text-xs text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}
            {loading ? (
              <EmptyState message="Loading users…" />
            ) : users.length === 0 ? (
              <EmptyState message="No users found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-edge/60">
                      {['Email', 'Status', 'Role', 'Load (kW)', 'Solar (kWp)', 'Bus', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/30">
                    {users.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-white">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[u.status]}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => void handleRoleChange(u.id, e.target.value)}
                            disabled={u.email === 'admin@sovereign.amm'}
                            className="rounded-lg border border-edge/60 bg-slate-800/60 px-2 py-1 text-xs text-white focus:border-telemetry/60 focus:outline-none disabled:opacity-50"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{u.sanctioned_load_kw}</td>
                        <td className="px-4 py-3 text-slate-300">{u.solar_kwp}</td>
                        <td className="px-4 py-3 text-slate-300">{u.assigned_bus_id ?? '—'}</td>
                        <td className="px-4 py-3">
                          {u.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleApprove(u.id)}
                                className="rounded-full border border-emerald-500/50 px-2.5 py-0.5 text-[10px] text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleReject(u.id)}
                                className="rounded-full border border-rose-500/50 px-2.5 py-0.5 text-[10px] text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TerminalPanel>
        </div>
      </div>
    </AdminGate>
  );
}
