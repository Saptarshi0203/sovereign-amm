"use client";

import { useEffect, useState } from "react";

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<any>({});
  const [demoState, setDemoState] = useState<any>({ active_scenario: null, narration: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/demo/scenarios")
      .then(res => res.json())
      .then(data => {
        setScenarios(data);
        setLoading(false);
      });

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/stream");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state" && data.demo) {
          setDemoState(data.demo);
        }
      } catch (e) {}
    };

    return () => ws.close();
  }, []);

  const triggerScenario = async (id: string) => {
    await fetch(`http://127.0.0.1:8000/api/demo/trigger/${id}`, {
      method: "POST"
    });
  };

  if (loading) return <div className="p-8 text-textMuted">Loading scenarios...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-outfit font-bold text-textMain">Judge Demo Mode</h1>
          <p className="text-textMuted mt-2">Trigger predefined grid conditions to evaluate the AMM's response.</p>
        </div>
      </div>

      {demoState.narration && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6 mb-8 flex gap-4 items-start shadow-[0_0_15px_rgba(139,92,246,0.1)]">
          <div className="text-4xl">🎙️</div>
          <div>
            <h3 className="font-bold text-accent uppercase tracking-wider text-sm mb-2">Live Narration</h3>
            <p className="text-lg leading-relaxed">{demoState.narration}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(scenarios).map(([id, s]: [string, any]) => (
          <div 
            key={id} 
            className={`bg-surface border rounded-lg p-6 flex flex-col justify-between transition-all ${
              demoState.active_scenario === id 
                ? "border-accent ring-2 ring-accent/50 shadow-[0_0_20px_rgba(139,92,246,0.2)]" 
                : "border-border hover:border-textMuted"
            }`}
          >
            <div>
              <h2 className="text-xl font-bold font-outfit capitalize mb-2">{id.replace("_", " ")}</h2>
              <p className="text-textMuted text-sm mb-4">{s.description}</p>
              
              <div className="bg-surfaceHighlight p-3 rounded text-xs font-jetbrains text-textMuted space-y-1 mb-6">
                <div>Load Mult: <span className="text-textMain">{s.load_multiplier}x</span></div>
                <div>Solar Mult: <span className="text-textMain">{s.sunlight_multiplier}x</span></div>
                <div>$\gamma$ (Risk): <span className="text-textMain">{s.gamma}</span></div>
                <div>$\sigma$ (Vol): <span className="text-textMain">{s.sigma}</span></div>
              </div>
            </div>
            
            <button 
              onClick={() => triggerScenario(id)}
              className={`w-full py-2 rounded-md font-bold transition-colors ${
                demoState.active_scenario === id 
                  ? "bg-accent/20 text-accent cursor-default" 
                  : "bg-surfaceHighlight hover:bg-textMain hover:text-bg text-textMain"
              }`}
              disabled={demoState.active_scenario === id}
            >
              {demoState.active_scenario === id ? "ACTIVE SCENARIO" : "TRIGGER EVENT"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
