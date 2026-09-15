'use client';

/**
 * @file RecentArticles.tsx
 * @description Displays the 3 most recently published articles from the
 * static knowledge base, sorted by `publishedAt` descending.
 *
 * Defect #2 fix: The string "No articles available" must NEVER appear.
 * ARTICLES is a frozen array of 5 articles — it is never empty — so no
 * conditional branch for an empty state exists here.
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import React from 'react';
import Link from 'next/link';
import { ARTICLES } from '@/lib/mock/articles';
import { Badge } from '@/components/ui/Badge';
import type { BadgeColor } from '@/components/ui/Badge';

// ---------------------------------------------------------------------------
// Derived constant — computed once at module scope, never inside render
// ---------------------------------------------------------------------------

/** 3 most recently published articles, sorted by ISO date string descending. */
const RECENT = [...ARTICLES]
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .slice(0, 3);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Sidebar widget that renders the 3 most recently dated research articles.
 *
 * Each card links to `/articles/[slug]` and shows the category badge,
 * estimated read time, and article title. A "View All Articles" footer link
 * navigates to `/articles`.
 */
export function RecentArticles(): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-slate-400 font-sans">
        Recent Articles
      </h2>

      <div className="flex flex-col divide-y divide-slate-800">
        {RECENT.map((article) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="flex flex-col gap-1.5 py-3 hover:bg-slate-800/40 px-2 rounded transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Badge color={article.badgeColor as BadgeColor}>
                {article.category}
              </Badge>
              <span className="text-xs font-mono text-slate-500">
                {article.readTime} MIN
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {article.title}
            </p>
          </Link>
        ))}
      </div>

      <Link
        href="/articles"
        className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors self-end"
      >
        View All Articles →
      </Link>
    </div>
  );
}

export default RecentArticles;
