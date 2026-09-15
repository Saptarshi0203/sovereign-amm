'use client';

import { RecentArticles } from './RecentArticles';
import { RagCopilot } from './RagCopilot';

/**
 * Sidebar — right-hand panel that stacks two cards vertically:
 *   1. RecentArticles — latest knowledge-base articles
 *   2. RagCopilot    — natural-language Q&A over engine docs
 *
 * Responsive layout: full-width below lg breakpoint; fixed 30% column at lg+.
 *
 * Requirements: 7.1–7.7, 14.1–14.10, 15.1–15.7
 */
export function Sidebar() {
  return (
    <aside className="w-full lg:w-[30%] flex flex-col gap-6">
      {/* ── Recent Articles ─────────────────────────────────────────────── */}
      <section className="bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
        <RecentArticles />
      </section>

      {/* ── RAG Copilot ─────────────────────────────────────────────────── */}
      <section className="bg-slate-900 rounded-lg border border-sky-200 dark:border-slate-800 shadow-sm dark:shadow-none p-6">
        <RagCopilot />
      </section>
    </aside>
  );
}

export default Sidebar;
