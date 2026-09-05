"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "settlement">("overview");
  
  const [overview, setOverview] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [settlement, setSettlement] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resOverview, resTrades, resSettlement] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/account/overview"),
          fetch("http://127.0.0.1:8000/api/account/trades"),
          fetch("http://127.0.0.1:8000/api/account/settlement")
        ]);

        if (resOverview.status === 401 || resOverview.status === 403) {
          router.push("/login");
          return;
        }

        setOverview(await resOverview.json());
        setTrades(await resTrades.json());
        setSettlement(await resSettlement.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  const downloadNeft = () => {
    window.open("http://127.0.0.1:8000/api/account/settlement/export-neft", "_blank");
  };

  if (loading) return <div className="p-8 text-textMuted">Loading account data...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-textMain">My Account</h1>
          <p className="text-textMuted mt-2">Manage your energy profile, trading history, and settlement.</p>
        </div>
        
        {/* SIMULATED SETTLEMENT BADGE - Requested by Feature 3 */}
        <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>
          SIMULATED SETTLEMENT
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-surfaceHighlight p-1 rounded-lg w-max">
        {["overview", "trades", "settlement"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 text-sm font-medium rounded-md capitalize transition-colors ${
              activeTab === tab ? "bg-accent text-bg" : "text-textMuted hover:text-textMain"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && overview && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
              <h3 className="text-sm text-textMuted uppercase">Grid Import</h3>
              <p className="text-2xl font-bold mt-2 font-jetbrains">{overview.grid_import_kwh} <span className="text-sm text-textMuted">kWh</span></p>
            </div>
            <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
              <h3 className="text-sm text-textMuted uppercase">Solar Export</h3>
              <p className="text-2xl font-bold mt-2 font-jetbrains">{overview.solar_export_kwh} <span className="text-sm text-textMuted">kWh</span></p>
            </div>
            <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
              <h3 className="text-sm text-textMuted uppercase">Total Spent</h3>
              <p className="text-2xl font-bold mt-2 font-jetbrains text-red-400">₹{overview.total_spent}</p>
            </div>
            <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
              <h3 className="text-sm text-textMuted uppercase">Total Earned</h3>
              <p className="text-2xl font-bold mt-2 font-jetbrains text-green-400">₹{overview.total_earned}</p>
            </div>
          </div>
          
          <div className="bg-surface border border-border p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold mb-6 font-outfit">Daily Energy Breakdown</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.daily_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D2D2D" />
                  <XAxis dataKey="hour" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333' }} />
                  <Legend />
                  <Bar dataKey="import" name="Import (kWh)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="export" name="Export (kWh)" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Trades Tab */}
      {activeTab === "trades" && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden animate-in fade-in">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surfaceHighlight text-textMuted text-xs uppercase tracking-wider">
                <th className="p-4 border-b border-border">Status</th>
                <th className="p-4 border-b border-border">ID / Time</th>
                <th className="p-4 border-b border-border">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {trades.length === 0 && (
                <tr><td colSpan={3} className="p-4 text-center text-textMuted">No trades found.</td></tr>
              )}
              {trades.map((t, idx) => (
                <tr key={idx} className="hover:bg-surfaceHighlight/50">
                  <td className="p-4">
                    {t.status === 'SUCCESS' ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-bold">CLEARED</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">REJECTED</span>
                    )}
                  </td>
                  <td className="p-4 text-sm font-jetbrains">
                    {t.id}<br/>
                    <span className="text-textMuted font-sans text-xs">{t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}</span>
                  </td>
                  <td className="p-4 text-sm">
                    {t.status === 'SUCCESS' ? (
                      <span>Volume: <b className="font-jetbrains">{t.volume_kw.toFixed(2)} kW</b> @ <b className="font-jetbrains">₹{t.price.toFixed(4)}</b></span>
                    ) : (
                      <span className="text-red-400">{t.reason}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settlement Tab */}
      {activeTab === "settlement" && settlement && (
        <div className="bg-surface border border-border rounded-lg p-8 max-w-2xl animate-in fade-in shadow-sm">
          <h2 className="text-xl font-bold font-outfit mb-6">Monthly Settlement Statement</h2>
          
          <div className="space-y-4 mb-8 text-sm">
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-textMuted">Billing Period</span>
              <span className="font-bold">{settlement.period}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-textMuted">Total Energy Purchases</span>
              <span>₹{settlement.total_buys}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-textMuted">Total Energy Sales</span>
              <span>₹{settlement.total_sells}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border text-lg mt-4">
              <span className="text-textMuted">Net Settlement Amount</span>
              <span className={`font-bold font-jetbrains ${settlement.net_amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {settlement.net_amount < 0 ? `Payable: ₹${Math.abs(settlement.net_amount)}` : `Receivable: ₹${settlement.net_amount}`}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-border">
              <span className="text-textMuted">Linked Bank Account</span>
              <span className="font-jetbrains text-yellow-400">{settlement.masked_account}</span>
            </div>
          </div>
          
          <button 
            onClick={downloadNeft}
            className="w-full bg-accent text-bg font-bold py-3 rounded-lg hover:bg-accent/90 transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]"
          >
            Export NPCI Bulk-NEFT Payout File
          </button>
          <p className="text-xs text-textMuted mt-4 text-center">
            *This generates a simulated CSV payout instruction file compliant with Indian DISCOM settlement standards.
          </p>
        </div>
      )}
    </div>
  );
}
