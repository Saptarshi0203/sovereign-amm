"use client";

import { useState, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { file: string; section: string; relevance: string }[];
  live_state?: string;
}

const EXAMPLE_QUESTIONS = [
  "Why is the spread so wide?",
  "What is rainflow degradation?",
  "How does PTDF screening work?",
  "Why was a trade rejected?",
  "What is the micro-price formula?",
];

export function RagCopilot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const askQuestion = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const userMsg: Message = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      const assistantMsg: Message = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        live_state: data.live_state,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Failed to reach RAG sidecar. Is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(input);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-mono text-xs">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-textMuted text-center text-[10px] uppercase tracking-widest mb-2">
              Ask about the engine
            </p>
            {EXAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => askQuestion(q)}
                className="text-left px-3 py-2 bg-white/5 border border-white/10 rounded-lg hover:border-accent hover:text-accent hover:bg-accent/10 transition-colors duration-150 text-textMuted shadow-sm font-sans text-xs"
              >
                → {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`p-3 rounded-xl backdrop-blur-md shadow-sm border ${msg.role === "user" ? "bg-accent/10 border-accent/50 ml-8" : "bg-white/5 border-white/10 mr-8"}`}>
            <div className={`text-[9px] uppercase tracking-widest mb-1 font-sans ${msg.role === "user" ? "text-accent" : "text-textMuted"}`}>
              {msg.role === "user" ? "YOU" : "COPILOT"}
            </div>
            <div className="text-textMain whitespace-pre-wrap leading-relaxed font-sans text-xs">
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/10">
                <div className="text-[9px] text-textMuted uppercase tracking-widest mb-1 font-sans">Sources</div>
                {msg.sources.map((s, j) => (
                  <div key={j} className="text-textMuted font-sans text-[10px]">
                    📄 {s.file} → {s.section} <span className="text-accent">({s.relevance})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="p-2 bg-background border border-border animate-pulse">
            <span className="text-textMuted">Searching docs...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the engine..."
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-textMain placeholder-textMuted/50 focus:outline-none focus:border-accent focus:shadow-glow-accent font-sans text-xs transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-accent/20 border border-accent rounded-full text-accent hover:bg-accent/30 hover:shadow-glow-accent disabled:opacity-50 transition-all font-sans font-bold text-xs"
        >
          ASK
        </button>
      </form>
    </div>
  );
}
