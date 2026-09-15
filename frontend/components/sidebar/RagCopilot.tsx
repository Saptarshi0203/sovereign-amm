'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, User, Bot } from 'lucide-react';

import { queryRag } from '@/lib/api';

/** Maximum number of messages retained in the view. */
const MAX_MESSAGES = 50;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** True while an assistant reply is still pending (skeleton entry). */
  pending?: boolean;
}

/**
 * RagCopilot — sidebar Q&A widget backed by the RAG explainability sidecar.
 *
 * Behaviour:
 * - User types a query and hits Send (or presses Enter).
 * - Message is appended to the chat; a pending assistant entry is shown with
 *   a Loader2 spinner.
 * - POST /api/rag/query is made via queryRag(); on success the pending entry
 *   is replaced with the AI response rendered via react-markdown.
 * - On failure an error message is injected into the chat.
 * - The message list auto-scrolls to the bottom on every new entry.
 * - History is capped at MAX_MESSAGES (50) entries.
 *
 * Requirements: 14.1–14.10
 */
export function RagCopilot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: query };

    // Append user message + pending assistant placeholder
    setMessages((prev) =>
      [...prev, userMessage, { role: 'assistant' as const, content: '', pending: true }].slice(
        -MAX_MESSAGES,
      ),
    );

    try {
      const { response } = await queryRag(query);

      setMessages((prev) => {
        const updated = [...prev];
        // Replace the last (pending) assistant entry
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.pending) {
          updated[lastIdx] = { role: 'assistant', content: response };
        } else {
          updated.push({ role: 'assistant', content: response });
        }
        return updated.slice(-MAX_MESSAGES);
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const errorMsg =
          '⚠ Failed to reach the RAG sidecar. Please check your connection and try again.';
        if (updated[lastIdx]?.pending) {
          updated[lastIdx] = { role: 'assistant', content: errorMsg };
        } else {
          updated.push({ role: 'assistant', content: errorMsg });
        }
        return updated.slice(-MAX_MESSAGES);
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Section heading ───────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
        RAG Copilot
      </h2>

      {/* ── Message history ───────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 flex-1 overflow-y-auto min-h-[200px] max-h-[400px] pr-1"
        role="log"
        aria-label="Chat history"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="text-xs text-sky-700/80 dark:text-slate-400 text-center mt-4">
            Ask a question about the engine to get started.
          </p>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={idx}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar icon */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full ${
                  isUser ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-blue-100 dark:bg-blue-900/60'
                }`}
                aria-hidden="true"
              >
                {isUser ? (
                  <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-blue-400" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`flex-1 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-100 ml-6'
                    : 'bg-sky-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-6'
                }`}
              >
                {msg.pending ? (
                  /* Loading indicator inside the pending assistant bubble */
                  <div
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400"
                    role="status"
                    aria-label="Generating response"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span>Thinking…</span>
                  </div>
                ) : isUser ? (
                  /* Plain text for user messages */
                  <p>{msg.content}</p>
                ) : (
                  /* Markdown for AI responses */
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* ── Input area ────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 pt-2 border-t border-sky-200 dark:border-slate-800"
        aria-label="Send a message"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the engine..."
          disabled={loading}
          className="flex-1 bg-slate-800 border border-sky-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Message input"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-sky-500 hover:bg-sky-400 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4 text-white" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}

export default RagCopilot;
