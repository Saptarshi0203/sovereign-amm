"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/admin/users", {
        headers: { "Content-Type": "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: str) => {
    // Basic prompt for bus assignment (for demo)
    const busIdStr = prompt("Assign to Grid Bus ID (e.g. 1, 2):", "1");
    if (!busIdStr) return;
    const busId = parseInt(busIdStr, 10);
    
    await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigned_bus_id: busId })
    });
    fetchUsers();
  };

  const handleReject = async (userId: str) => {
    if (!confirm("Reject this user?")) return;
    await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}/reject`, {
      method: "POST",
    });
    fetchUsers();
  };

  const handleRoleChange = async (userId: str, newRole: str) => {
    await fetch(`http://127.0.0.1:8000/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole })
    });
    fetchUsers();
  };

  if (loading) return <div className="p-8 text-textMuted">Loading users...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-outfit font-bold text-textMain">Admin Dashboard</h1>
        <p className="text-textMuted mt-2">Manage users, approve signups, and assign roles & grid buses.</p>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surfaceHighlight text-textMuted text-xs uppercase tracking-wider">
              <th className="p-4 border-b border-border">Email</th>
              <th className="p-4 border-b border-border">Status</th>
              <th className="p-4 border-b border-border">Role</th>
              <th className="p-4 border-b border-border">Load (kW)</th>
              <th className="p-4 border-b border-border">Solar (kWp)</th>
              <th className="p-4 border-b border-border">Bus</th>
              <th className="p-4 border-b border-border">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surfaceHighlight/50">
                <td className="p-4 font-medium">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    u.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    u.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-4">
                  <select 
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-transparent border border-border rounded p-1 text-sm text-textMain focus:outline-none focus:border-accent"
                    disabled={u.email === 'admin@sovereign.amm'}
                  >
                    <option value="admin">Admin</option>
                    <option value="grid_operator">Grid Operator</option>
                    <option value="battery_operator">Battery Operator</option>
                    <option value="market_participant">Market Participant</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="p-4 text-sm text-textMuted">{u.sanctioned_load_kw}</td>
                <td className="p-4 text-sm text-textMuted">{u.solar_kwp}</td>
                <td className="p-4 text-sm text-textMuted">{u.assigned_bus_id ?? '-'}</td>
                <td className="p-4 space-x-2">
                  {u.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(u.id)} className="text-xs bg-accent text-bg px-2 py-1 rounded font-medium hover:bg-accent/90">Approve</button>
                      <button onClick={() => handleReject(u.id)} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-medium hover:bg-red-500/30">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
