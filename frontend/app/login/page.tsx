"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consumerNo, setConsumerNo] = useState("");
  const [connectionType, setConnectionType] = useState("residential");
  const [sanctionedLoadKw, setSanctionedLoadKw] = useState(0);
  const [solarKwp, setSolarKwp] = useState(0);
  const [inverterRatingKw, setInverterRatingKw] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const url = isLogin ? "http://127.0.0.1:8000/api/auth/login" : "http://127.0.0.1:8000/api/auth/signup";
    const payload = isLogin
      ? { email, password }
      : {
          email,
          password,
          consumer_no: consumerNo,
          connection_type: connectionType,
          sanctioned_load_kw: sanctionedLoadKw,
          solar_kwp: solarKwp,
          inverter_rating_kw: inverterRatingKw,
        };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Request failed");
      }

      if (isLogin) {
        router.push("/");
      } else {
        setMessage(data.message);
        setIsLogin(true); // Switch to login after signup
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-surface border border-border p-8 rounded-lg shadow-sm">
      <h2 className="text-2xl font-outfit font-bold text-textMain mb-6 text-center">
        {isLogin ? "Login to Sovereign-AMM" : "Signup for Sovereign-AMM"}
      </h2>
      
      {error && <div className="bg-red-500/10 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
      {message && <div className="bg-accent/10 text-accent p-3 rounded mb-4 text-sm">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-textMuted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-textMuted mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain"
            required
          />
        </div>

        {!isLogin && (
          <>
            <div>
              <label className="block text-sm text-textMuted mb-1">Consumer Number</label>
              <input
                type="text"
                value={consumerNo}
                onChange={(e) => setConsumerNo(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-textMuted mb-1">Connection Type</label>
              <select
                value={connectionType}
                onChange={(e) => setConnectionType(e.target.value)}
                className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-textMuted mb-1">Sanctioned Load (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sanctionedLoadKw}
                  onChange={(e) => setSanctionedLoadKw(parseFloat(e.target.value))}
                  className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-textMuted mb-1">Rooftop Solar (kWp)</label>
                <input
                  type="number"
                  step="0.1"
                  value={solarKwp}
                  onChange={(e) => setSolarKwp(parseFloat(e.target.value))}
                  className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-textMuted mb-1">Inverter Rating (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inverterRatingKw}
                  onChange={(e) => setInverterRatingKw(parseFloat(e.target.value))}
                  className="w-full bg-surfaceHighlight border border-border rounded p-2 text-textMain text-sm"
                  required
                />
              </div>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent text-bg font-medium py-2 rounded mt-4 hover:bg-accent/90 disabled:opacity-50"
        >
          {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-textMuted">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
            setMessage(null);
          }}
          className="text-accent hover:underline font-medium"
        >
          {isLogin ? "Sign Up" : "Login"}
        </button>
      </div>
    </div>
  );
}
