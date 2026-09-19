/**
 * @file ragStore.ts
 * @description Shared Zustand store for the RAG Copilot. Both the floating
 * slide-over drawer and the full-page `/copilot` terminal read and write this
 * single store, so a conversation started in the drawer is exactly what the
 * page shows (and vice-versa). Sessions persist to localStorage under
 * `sovereign-rag` so past chats survive a refresh.
 *
 * Streaming: `ask()` POSTs to /api/rag/stream (SSE) and appends deltas to the
 * pending assistant message; `stop()` aborts the fetch. It falls back to the
 * non-streaming /api/rag/query if the stream cannot be opened.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface RagTelemetry {
  grid_id: string;
  source: 'engine' | 'history';
  tick?: number;
  micro_price?: number;
  best_bid?: number;
  best_ask?: number;
  spread?: number;
  obi?: number;
  soc_pct?: number;
  c_deg?: number;
  lines?: { id: string; from: string; to: string; flow_mw: number; capacity_mw: number; flow_pct: number; status: string }[];
  lmp?: { bus: string; lmp: number; congestion: number; status: string }[];
  glft?: Record<string, number | null>;
}

export interface RagMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  followups?: string[];
  telemetry?: RagTelemetry | null;
  provider?: string;
  pending?: boolean;
  error?: boolean;
  ts: number;
}

export interface RagSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: RagMessage[];
}

export interface RagStoreState {
  sessions: RagSession[];
  activeSessionId: string | null;
  drawerOpen: boolean;
  streaming: boolean;
  includeLiveTelemetry: boolean;
  hydrated: boolean;

  ask(query: string): Promise<void>;
  stop(): void;
  newSession(): string;
  selectSession(id: string): void;
  deleteSession(id: string): void;
  clearActive(): void;
  setDrawerOpen(open: boolean): void;
  setIncludeLiveTelemetry(v: boolean): void;
  setHydrated(v: boolean): void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
const MAX_SESSIONS = 20;
const MAX_MESSAGES = 60;

let controller: AbortController | null = null;
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function makeSession(): RagSession {
  const now = Date.now();
  return { id: uid('s'), title: 'New session', createdAt: now, updatedAt: now, messages: [] };
}

/** Parse an SSE byte stream, invoking `onEvent(event, data)` per message. */
async function readSse(res: Response, onEvent: (event: string, data: string) => void): Promise<void> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of raw.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) onEvent(event, data.join('\n'));
    }
  }
}

export const useRagStore = create<RagStoreState>()(
  persist(
    (set, get) => {
      const patchMessage = (sessionId: string, messageId: string, patch: Partial<RagMessage> | ((m: RagMessage) => Partial<RagMessage>)) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id !== sessionId
              ? sess
              : {
                  ...sess,
                  updatedAt: Date.now(),
                  messages: sess.messages.map((m) => (m.id === messageId ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)),
                },
          ),
        }));

      return {
        sessions: [],
        activeSessionId: null,
        drawerOpen: false,
        streaming: false,
        includeLiveTelemetry: true,
        hydrated: false,

        newSession: () => {
          const sess = makeSession();
          set((s) => ({ sessions: [sess, ...s.sessions].slice(0, MAX_SESSIONS), activeSessionId: sess.id }));
          return sess.id;
        },

        selectSession: (id) => set({ activeSessionId: id }),

        deleteSession: (id) =>
          set((s) => {
            const sessions = s.sessions.filter((x) => x.id !== id);
            return { sessions, activeSessionId: s.activeSessionId === id ? sessions[0]?.id ?? null : s.activeSessionId };
          }),

        clearActive: () => {
          get().stop();
          const id = get().activeSessionId;
          if (!id) return;
          set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, messages: [], title: 'New session', updatedAt: Date.now() } : x)) }));
        },

        setDrawerOpen: (open) => set({ drawerOpen: open }),
        setIncludeLiveTelemetry: (v) => set({ includeLiveTelemetry: v }),
        setHydrated: (v) => set({ hydrated: v }),

        stop: () => {
          controller?.abort();
          controller = null;
          set({ streaming: false });
        },

        ask: async (raw) => {
          const query = raw.trim();
          if (!query || get().streaming) return;
          let sessionId = get().activeSessionId;
          if (!sessionId || !get().sessions.some((s) => s.id === sessionId)) sessionId = get().newSession();

          const userMsg: RagMessage = { id: uid('u'), role: 'user', content: query, ts: Date.now() };
          const botMsg: RagMessage = { id: uid('a'), role: 'assistant', content: '', pending: true, ts: Date.now() };
          set((s) => ({
            streaming: true,
            sessions: s.sessions.map((sess) =>
              sess.id !== sessionId
                ? sess
                : {
                    ...sess,
                    title: sess.messages.length === 0 ? query.slice(0, 60) : sess.title,
                    updatedAt: Date.now(),
                    messages: [...sess.messages, userMsg, botMsg].slice(-MAX_MESSAGES),
                  },
            ),
          }));

          controller = new AbortController();
          const body = JSON.stringify({ query, include_live_telemetry: get().includeLiveTelemetry });
          const sid = sessionId;
          try {
            const res = await fetch(`${API_BASE}/api/rag/stream`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
              body,
              signal: controller.signal,
            });
            if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
            await readSse(res, (event, data) => {
              if (event === 'meta') {
                const meta = JSON.parse(data) as { sources: string[]; suggested_followups: string[]; telemetry: RagTelemetry | null; provider: string };
                patchMessage(sid, botMsg.id, { sources: meta.sources, followups: meta.suggested_followups, telemetry: meta.telemetry, provider: meta.provider });
              } else if (event === 'done') {
                patchMessage(sid, botMsg.id, { pending: false });
              } else {
                const { delta } = JSON.parse(data) as { delta: string };
                patchMessage(sid, botMsg.id, (m) => ({ content: m.content + delta, pending: false }));
              }
            });
            patchMessage(sid, botMsg.id, { pending: false });
          } catch (e) {
            if ((e as Error).name === 'AbortError') {
              patchMessage(sid, botMsg.id, (m) => ({ pending: false, content: m.content || '_Stopped._' }));
            } else {
              // Fallback: non-streaming endpoint.
              try {
                const r = await fetch(`${API_BASE}/api/rag/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
                if (!r.ok) throw new Error(`query ${r.status}`);
                const j = (await r.json()) as { answer: string; sources: string[]; suggested_followups: string[]; telemetry: RagTelemetry | null; provider: string };
                patchMessage(sid, botMsg.id, { content: j.answer, sources: j.sources, followups: j.suggested_followups, telemetry: j.telemetry, provider: j.provider, pending: false });
              } catch (err) {
                patchMessage(sid, botMsg.id, {
                  pending: false,
                  error: true,
                  content: `The copilot backend is unreachable (${err instanceof Error ? err.message : 'network error'}). Check that the API is running and NEXT_PUBLIC_API_URL points at it.`,
                });
              }
            }
          } finally {
            controller = null;
            set({ streaming: false });
          }
        },
      };
    },
    {
      name: 'sovereign-rag',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        activeSessionId: s.activeSessionId,
        includeLiveTelemetry: s.includeLiveTelemetry,
        // never persist an in-flight placeholder
        sessions: s.sessions.map((x) => ({ ...x, messages: x.messages.filter((m) => !m.pending) })),
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

/** Active session (or null). */
export const selectActiveSession = (s: RagStoreState): RagSession | null => s.sessions.find((x) => x.id === s.activeSessionId) ?? null;

export const PREDEFINED_QUESTIONS: { pillar: string; questions: string[] }[] = [
  {
    pillar: 'Platform & Getting Started',
    questions: [
      'How does paper trading work on Sovereign-AMM?',
      'How can I export the 10-second tick historical dataset to CSV?',
      'What is the difference between Demo Sandbox Mode and Live Authenticated Mode?',
    ],
  },
  {
    pillar: 'Market Microstructure & Quant Math',
    questions: [
      'Explain how the GLFT model adjusts bid/ask quotes based on battery State-of-Charge.',
      'How is Order Book Imbalance (OBI) calculated and how does it influence price discovery?',
      'What is the exact mathematical formula used to calculate Rainflow battery degradation costs?',
    ],
  },
  {
    pillar: 'Grid Physics & PTDF Congestion',
    questions: [
      'How does Power Transfer Distribution Factor (PTDF) screening prevent transmission line overloads?',
      'What happens when I inject a 5.0 MW load spike into Bus-05?',
      'How are Locational Marginal Prices (LMP) derived from physical transmission constraints?',
    ],
  },
  {
    pillar: 'Live Market Analytics',
    questions: [
      'Analyze the current microgrid market conditions and battery SoC status.',
      'Are any grid lines currently experiencing congestion?',
      'What is the current bid-ask spread and inventory skew?',
    ],
  },
];
