'use client';

import { useEffect, useState } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { LiveRibbon } from '@/components/layout/LiveRibbon';
import { PageHeader } from '@/components/ui/PageHeader';
import { TerminalPanel } from '@/components/ui/TerminalPanel';
import { KeyValue } from '@/components/ui/KeyValue';
import { EmptyState } from '@/components/ui/EmptyState';
import { API_BASE, WS_BASE } from '@/lib/live/session';

interface ScenarioConfig {
  description: string;
  load_multiplier: number;
  sunlight_multiplier: number;
  gamma: number;
  sigma: number;
}

interface DemoState {
  active_scenario: string | null;
  narration: string;
}

function ScenarioCard({
  id,
  config,
  isActive,
  onTrigger,
}: {
  id: string;
  config: ScenarioConfig;
  isActive: boolean;
  onTrigger: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-5 transition-colors ${
        isActive
          ? 'border-telemetry/50 bg-telemetry/5'
          : 'border-edge/40 bg-slate-900/40 hover:border-edge/70'
      }`}
    >
      <div>
        <p className={`label-caps mb-1 ${isActive ? 'text-telemetry' : ''}`}>
          {isActive && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-telemetry align-middle" aria-hidden="true" />}
          {id.replace(/_/g, ' ')}
        </p>
        <p className="text-sm text-slate-400">{config.description}</p>
      </div>

      <KeyValue
        items={[
          { label: 'Load multiplier', value: `${config.load_multiplier}×` },
          { label: 'Solar multiplier', value: `${config.sunlight_multiplier}×` },
          { label: 'γ (risk aversion)', value: config.gamma.toFixed(2) },
          { label: 'σ (volatility)', value: config.sigma.toFixed(3) },
        ]}
      />

      <button
        type="button"
        onClick={onTrigger}
        disabled={isActive}
        className={`w-full rounded-full py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors ${
          isActive
            ? 'cursor-default border border-telemetry/40 bg-telemetry/10 text-telemetry'
            : 'border border-edge/50 text-slate-300 hover:border-white/60 hover:text-white'
        }`}
      >
        {isActive ? 'Active scenario' : 'Trigger event'}
      </button>
    </div>
  );
}

export default function DemoPage() {
  const [scenarios, setScenarios] = useState<Record<string, ScenarioConfig>>({});
  const [demoState, setDemoState] = useState<DemoState>({ active_scenario: null, narration: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/demo/scenarios`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json() as Promise<Record<string, ScenarioConfig>>;
      })
      .then((data) => {
        setScenarios(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load scenarios');
        setLoading(false);
      });

    const ws = new WebSocket(`${WS_BASE}/ws/stream`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === 'state' && data.demo) {
          setDemoState(data.demo as DemoState);
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => ws.close();
  }, []);

  const triggerScenario = async (id: string) => {
    await fetch(`${API_BASE}/api/demo/trigger/${id}`, { method: 'POST' });
  };

  return (
    <>
      <LiveRibbon />

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <PageHeader
          label="06 — DEMO"
          title="Judge Demo Mode"
          subtitle="Trigger predefined grid conditions to evaluate the AMM's response"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-300">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Scenario Engine
          </span>
        </PageHeader>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* Live narration panel — only when active */}
          {demoState.narration && (
            <TerminalPanel label="00 — LIVE NARRATION" className="lg:col-span-12">
              <p className="font-mono text-sm text-white leading-relaxed">{demoState.narration}</p>
            </TerminalPanel>
          )}

          {/* Scenario cards */}
          <TerminalPanel
            label="01 — SCENARIOS"
            className="lg:col-span-12"
          >
            {loading ? (
              <div className="flex items-center gap-3 py-8 font-mono text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading scenarios…
              </div>
            ) : error ? (
              <EmptyState
                message="Could not load scenarios"
                submessage={error}
              />
            ) : Object.keys(scenarios).length === 0 ? (
              <EmptyState message="No scenarios configured" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(scenarios).map(([id, config]) => (
                  <ScenarioCard
                    key={id}
                    id={id}
                    config={config}
                    isActive={demoState.active_scenario === id}
                    onTrigger={() => void triggerScenario(id)}
                  />
                ))}
              </div>
            )}
          </TerminalPanel>
        </div>
      </div>
    </>
  );
}
