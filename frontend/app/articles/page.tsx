'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ARTICLES } from '@/lib/mock/articles';
import { Badge } from '@/components/ui/Badge';
import type { BadgeColor } from '@/components/ui/Badge';
import type { Article } from '@/lib/types';
import { SectionLabel, Hairline, Reveal } from '@/components/ui/Editorial';
import { SegmentedPill } from '@/components/ui/SegmentedPill';

const CATEGORIES = ['ALL', 'QUANT RESEARCH', 'HARDWARE PHYSICS', 'GRID PHYSICS', 'WHITE PAPER', 'APPLIED CRYPTO'] as const;

export default function ArticlesPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const filtered: readonly Article[] = filter === 'ALL'
    ? ARTICLES
    : ARTICLES.filter((a) => a.category === filter);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10">

      {/* Header */}
      <SectionLabel n="01">Articles</SectionLabel>
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Research &amp; Whitepapers
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Quantitative research, hardware physics, and applied cryptography behind Sovereign-AMM.
          </p>
        </div>
        <div className="flex items-end lg:col-span-5 lg:justify-end">
          <SegmentedPill
            options={['ALL', ...CATEGORIES.slice(1).map((c) => c.split(' ')[0])]}
            value={filter === 'ALL' ? 'ALL' : filter.split(' ')[0]}
            onChange={(v) => setFilter(v === 'ALL' ? 'ALL' : CATEGORIES.find((c) => c.startsWith(v)) ?? v)}
          />
        </div>
      </div>

      <Hairline className="mt-8 mb-10" />

      {/* Article list — numbered editorial rows */}
      <ol className="divide-y divide-edge/30">
        {filtered.map((article, i) => (
          <li key={article.slug}>
            <Reveal delay={i * 0.04}>
              <Link
                href={`/articles/${article.slug}`}
                className="group grid grid-cols-[3rem_1fr_auto] items-start gap-6 py-7 sm:grid-cols-[4rem_1fr_auto]"
              >
                {/* Number */}
                <span className="font-mono text-3xl text-slate-600 tabular-nums sm:text-4xl" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Title + summary */}
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge color={article.badgeColor as BadgeColor}>{article.category}</Badge>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {new Date(article.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold leading-snug text-white transition-colors group-hover:text-telemetry sm:text-2xl">
                    {article.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-slate-400">{article.summary}</p>
                </div>

                {/* Read time */}
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {article.readTime} min
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-12 text-center font-mono text-sm text-slate-500">
            No articles in this category.
          </li>
        )}
      </ol>
    </div>
  );
}
