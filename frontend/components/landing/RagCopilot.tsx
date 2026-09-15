'use client';

/**
 * @file RagCopilot.tsx
 * @module components/landing/RagCopilot
 * @description Local keyword-matching RAG chat widget.
 *
 * Defect #3 fix: answers come from `matchQuery()` in `lib/mock/rag.ts`.
 * No HTTP calls are made — all logic runs client-side with a simulated 600 ms
 * latency from the mock module.
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import { matchQuery } from '@/lib/mock/rag';
import type { RagResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  /** True while the 600 ms mock latency is in flight. */
  pending?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Initial suggested questions shown when the message list is empty. */
const SUGGESTED: string[] = [
  'What is GLFT?',
  'How is degradation priced?',
  'Explain PTDF screening',
  'What is a micro-price?',
];

/** Maximum number of messages kept in memory (oldest are evicted). */
const MAX_MESSAGES = 40;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RAG copilot chat panel.
 *
 * On submit the query is passed to `matchQuery(query)` from the local mock
 * module. While the 600 ms promise is pending a bouncing-dots indicator is
 * shown in the assistant bubble. Once resolved the bubble is updated with the
 * answer and source chips.
 *
 * Suggested questions are shown only when the message list is empty; after
 * the first message they are replaced by the live conversation.
 */
export function RagCopilot(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Submit a query string to `matchQuery` and manage message state.
   *
   * 1. Append user message immediately.
   * 2. Append pending assistant bubble.
   * 3. Await `matchQuery` (600 ms simulated latency).
   * 4. Replace the pending bubble with the resolved answer.
   */
  const submit = async (query: string): Promise<void> => {
    if (!query.trim() || loading) return;

    setInput('');
    setLoading(true);

    setMessages((prev) =>
      [
        ...prev,
        { role: 'user' as const, content: query },
        { role: 'assistant' as const, content: '', pending: true },
      ].slice(-MAX_MESSAGES),
    );

    const result: RagResult = await matchQuery(query);

    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.pending) {
        updated[updated.length - 1] = {
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
        };
      }
      return updated;
    });

    setLoading(false);
  };

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    void submit(input);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-sky-700/80 dark:text-slate-400 font-sans">
        RAG Copilot
      </h2>

      {/* Message list */}
      <div
        className="flex flex-col gap-2 min-h-[120px] max-h-[280px] overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-label="RAG copilot conversation"
      >
        {/* Suggested question chips — only while conversation is empty */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => void submit(q)}
                className="text-xs px-2.5 py-1 bg-sky-100 dark:bg-slate-800 hover:bg-sky-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full border border-sky-200 dark:border-slate-700 transition-colors"
                type="button"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sky-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-900 border border-sky-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {msg.pending ? (
                /* Typing / loading indicator */
                <div
                  className="flex gap-1 items-center text-sky-600 dark:text-slate-500"
                  aria-label="Loading response"
                >
                  <span className="animate-bounce">·</span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  >
                    ·
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  >
                    ·
                  </span>
                </div>
              ) : (
                <>
                  <p>{msg.content}</p>

                  {/* Source chips */}
                  {msg.sources !== undefined && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {msg.sources.map((src, si) => (
                        <span
                          key={si}
                          className="text-xs px-1.5 py-0.5 bg-sky-100 dark:bg-emerald-900/30 text-sky-700 dark:text-emerald-400 rounded border border-sky-200 dark:border-emerald-800/50 font-mono"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={endRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-sky-200 dark:border-slate-800 pt-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the engine..."
          disabled={loading}
          aria-label="Query input"
          className="flex-1 bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 dark:focus:ring-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send query"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-500 hover:bg-sky-400 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-white" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export default RagCopilot;
