import type { Metadata } from 'next';
import { CopilotTerminal } from '@/components/rag/CopilotTerminal';

export const metadata: Metadata = {
  title: 'RAG Copilot | Sovereign-AMM',
  description: 'Retrieval-augmented Lead Microgrid Quant Analyst: GLFT quoting, Rainflow degradation, PTDF congestion and live market state.',
};

export default function CopilotPage() {
  return <CopilotTerminal />;
}
