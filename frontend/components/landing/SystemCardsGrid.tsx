'use client';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/ui/Panel';

const BatteryGauge = dynamic(() => import('@/components/charts/BatteryGauge').then(m => m.BatteryGauge), { ssr: false });
const QuoteExplanation = dynamic(() => import('@/components/panels/QuoteExplanation').then(m => m.QuoteExplanation), { ssr: false });
const JudgeControls = dynamic(() => import('@/components/panels/JudgeControls').then(m => m.JudgeControls), { ssr: false });

export function SystemCardsGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Panel className="p-5">
        <h2 className="text-xs uppercase tracking-widest text-slate-400 mb-4 font-sans">Battery Gauge</h2>
        <BatteryGauge />
      </Panel>
      <Panel className="p-5">
        <QuoteExplanation />
      </Panel>
      <Panel className="p-5">
        <JudgeControls />
      </Panel>
    </div>
  );
}
export default SystemCardsGrid;
