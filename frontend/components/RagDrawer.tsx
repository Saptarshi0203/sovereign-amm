"use client";

import { useState } from "react";

export default function RagDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Array<{role: string, text: string}>>([
    { role: "system", text: "Hi! I am your Math & Grid Operations Guide. Ask me why a trade was rejected, how the Rainflow algorithm works, or why the spread widened." }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Add user query
    const newQuery = { role: "user", text: query };
    setHistory(prev => [...prev, newQuery]);
    setQuery("");
    setIsTyping(true);

    // Mock RAG response latency
    setTimeout(() => {
      let answer = "I'm a mock AI for the hackathon demo. But in production, I would embed this question against the GLFT paper, our PTDF logic, and the real-time event log to answer.";
      
      const q = newQuery.text.toLowerCase();
      if (q.includes("ptdf") || q.includes("reject")) {
        answer = "Trades are rejected if they imply a power transfer that violates the thermal limits of any line in the grid. We use the Power Transfer Distribution Factor (PTDF) matrix to pre-screen every match before the ledger commits it.";
      } else if (q.includes("rainflow") || q.includes("wear") || q.includes("degradation")) {
        answer = "The Rainflow cycle counting algorithm extracts the depth-of-discharge (DoD) from the battery's SoC time-series. We then apply a Woehler fatigue curve to cost that micro-cycle, directly folding it into the Ask price as C_deg.";
      } else if (q.includes("glft") || q.includes("spread")) {
        answer = "The GLFT (Guéant-Lehalle-Fernandez-Tapia) model is an asymptotic solution for optimal market making. We map battery inventory to an optimal Bid/Ask spread based on risk aversion (gamma) and order arrival intensity. As we run low on battery, the ask spread widens exponentially to discourage further discharge.";
      }

      setHistory(prev => [...prev, { role: "system", text: answer }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-bg rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 transition-transform flex items-center justify-center text-2xl z-40"
      >
        ✨
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-surface border-l border-border shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-border flex justify-between items-center bg-surfaceHighlight">
          <h2 className="font-outfit font-bold text-xl flex items-center gap-2">
            <span className="text-accent">✨</span> Explainability AI
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-textMuted hover:text-textMain transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-accent text-bg font-medium rounded-tr-none' 
                  : 'bg-surfaceHighlight border border-border text-textMain rounded-tl-none font-jetbrains text-xs'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-surfaceHighlight border border-border rounded-lg rounded-tl-none p-4 w-20 flex gap-1 items-center justify-center">
                <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-textMuted rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-background">
          <form onSubmit={handleSubmit} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about the math..."
              className="w-full bg-surface border border-border rounded-full py-3 pl-4 pr-12 focus:outline-none focus:border-accent text-sm transition-colors"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={isTyping || !query.trim()}
              className="absolute right-2 top-2 p-1.5 bg-accent text-bg rounded-full disabled:opacity-50 hover:bg-accent/90 transition-colors"
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm-2.846-1.55 4.338 2.76 7.494-7.493-11.832 4.733Z"/></svg>
            </button>
          </form>
          <div className="text-center mt-2 text-[10px] text-textMuted uppercase tracking-wider">
            Sovereign AMM Hackathon Demo
          </div>
        </div>
      </div>
    </>
  );
}
