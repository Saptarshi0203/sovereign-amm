'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { getArticles, type Article } from '@/lib/api';

/**
 * RecentArticles — sidebar card that shows the 5 most recent knowledge-base
 * articles fetched from GET /api/articles?limit=5.
 *
 * Behaviour:
 * - Shows a Loader2 spinner while the request is in flight.
 * - Renders a vertical list of article entries once loaded.
 * - Clicking an entry navigates to article.url.
 * - "View All Articles →" footer link navigates to /articles.
 * - "No articles available" empty state when the list is empty.
 *
 * Requirements: 15.1–15.7
 */
export function RecentArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getArticles(5)
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Section heading ───────────────────────────────────────────── */}
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
        Recent Articles
      </h2>

      {/* ── Loading state ─────────────────────────────────────────────── */}
      {loading && (
        <div
          className="flex justify-center items-center py-6"
          role="status"
          aria-label="Loading articles"
        >
          <Loader2
            className="h-5 w-5 animate-spin text-slate-400"
            aria-hidden="true"
          />
        </div>
      )}

      {/* ── Populated list ────────────────────────────────────────────── */}
      {!loading && articles.length > 0 && (
        <ul className="flex flex-col gap-2" role="list">
          {articles.map((article) => (
            <li key={article.id}>
              <a
                href={article.url}
                className="block p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label={article.title}
              >
                {/* Title */}
                <p className="text-sm font-medium text-white line-clamp-1">
                  {article.title}
                </p>

                {/* Date */}
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(article.publishedDate).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>

                {/* Summary */}
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {article.summary}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!loading && articles.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">
          No articles available
        </p>
      )}

      {/* ── Footer link ───────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-slate-800">
        <Link
          href="/articles"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View All Articles →
        </Link>
      </div>
    </div>
  );
}

export default RecentArticles;
