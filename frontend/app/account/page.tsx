'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { API_BASE } from '@/lib/live/session';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { SegmentedPill } from '@/components/ui/SegmentedPill';
import { KeyValue } from '@/components/ui/KeyValue';
import { EmptyState } from '@/components/ui/EmptyState';
import { Download } from 'lucide-react';

type Tab = 'overview' | 'trades' | 'settlement';

interface DailyPoint { hour: string; import: number; export: number }
interface Overview {
  grid_import_kwh: number;
  solar_export_kwh: number;
  total_spent: number;
  total_earned: number;
  daily_breakdown: DailyPoint[];
}
interface Trade {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'REJECTED';
  volume_kw: number;
  price: number;
  reason?: string;
}
interface Settlement {
  period: string;
  total_buys: number;
  total_sells: number;
  net_amount: number;
  masked_account: string;
}

export default function AccountPage() {
  const router                              = useRouter();
  const [tab, setTab]                       = useState<Tab>('overview');
  const [overview, setOverview]             = useState<Overview | null>(null);
  const [trades, setTrades]                 = useState<Trade[]>([]);
  const [settlement, setSettlement]         = useState<Settlement | null>(null);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resO, resT, resS] = await Promise.all([
          fetch(`${API_BASE}/api/account/overview`),
          fetch(`${API_BASE}/api/account/trades`),
          fetch(`${API_BASE}/api/account/settlement`),
        ]);
        if (resO.status === 401 || resO.status === 403) { router.push('/login'); return; }
        setOverview(await resO.json() as Overview);
        setTrades(await resT.json() as Trade[]);
        setSettlement(await resS.json() as Settlement);
      } catch {
        // swallow network errors in demo mode
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [router]);

  const downloadNeft = () => {
    window.open(`${API_BASE}/api/account/settlement/export-neft`, '_blank');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <p className="font-mono text-sm text-slate-500">Loading account data…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        label="Account"
        title="My Account"
        subtitle="Energy profile · trading history · settlement"
      >
        <span className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-warn">
          Simulated settlement
        </span>
      </PageHeader>

      <div className="mt-8 flex flex-col gap-6">
        {/* Tab switcher */}
        <SegmentedPill
          options={['overview', 'trades', 'settlement']}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />

        {/* Overview */}
        {tab === 'overview' && overview && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <TerminalPanel label="01 — ENERGY SUMMARY" className="lg:col-span-5">
              <KeyValue items={[
                { label: 'Grid import',   value: `${overview.grid_import_kwh} kWh` },
                { label: 'Solar export',  value: `${overview.solar_export_kwh} kWh` },
                { label: 'Total spent',   value: `₹${overview.total_spent}` },
                { label: 'Total earned',  value: `₹${overview.total_earned}` },
              ]} />
            </TerminalPanel>
            <TerminalPanel label="02 — DAILY BREAKDOWN" className="lg:col-span-7">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.daily_breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="hour" stroke="var(--chart-tick)" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis stroke="var(--chart-tick)" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--chart-tooltip-bg)', borderColor: 'var(--chart-axis)', fontFamily: 'monospace', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                    <Bar dataKey="import" name="Import (kWh)" fill="rgba(244,63,94,0.7)" radius={[3,3,0,0]} />
                    <Bar dataKey="export" name="Export (kWh)" fill="rgba(34,197,94,0.7)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TerminalPanel>
          </div>
        )}

        {/* Trades */}
        {tab === 'trades' && (
          <TerminalPanel label="03 — TRADE HISTORY">
            {trades.length === 0 ? (
              <EmptyState message="No trades found." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-mono text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-edge/60">
                      {['Status', 'ID', 'Time', 'Details'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge/30">
                    {trades.map((t, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          {t.status === 'SUCCESS'
                            ? <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">CLEARED</span>
                            : <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-600 dark:text-rose-400">REJECTED</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-slate-300">{t.id}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {t.timestamp ? new Date(t.timestamp).toLocaleTimeString('en-IN', { hour12: false }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {t.status === 'SUCCESS'
                            ? `${t.volume_kw.toFixed(2)} kW @ ₹${t.price.toFixed(4)}`
                            : <span className="text-rose-600 dark:text-rose-400">{t.reason}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TerminalPanel>
        )}

        {/* Settlement */}
        {tab === 'settlement' && settlement && (
          <TerminalPanel label="04 — SETTLEMENT STATEMENT" className="max-w-2xl">
            <h2 className="mb-4 font-display text-lg font-bold text-white">Monthly Settlement</h2>
            <KeyValue items={[
              { label: 'Billing period',         value: settlement.period },
              { label: 'Total energy purchases', value: `₹${settlement.total_buys}` },
              { label: 'Total energy sales',     value: `₹${settlement.total_sells}` },
              {
                label: 'Net settlement',
                value: (
                  <span className={settlement.net_amount < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}>
                    {settlement.net_amount < 0
                      ? `Payable: ₹${Math.abs(settlement.net_amount)}`
                      : `Receivable: ₹${settlement.net_amount}`}
                  </span>
                ),
              },
              { label: 'Linked account', value: <span className="text-warn">{settlement.masked_account}</span> },
            ]} />
            <button
              type="button"
              onClick={downloadNeft}
              className="btn-brand mt-6 inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Export NEFT Payout File
            </button>
            <p className="mt-3 font-mono text-[10px] text-slate-600">
              Simulated CSV payout instruction — NPCI Bulk-NEFT format.
            </p>
          </TerminalPanel>
        )}
      </div>
    </div>
  );
}
