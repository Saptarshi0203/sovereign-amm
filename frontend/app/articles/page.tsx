'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ARTICLES } from '@/lib/mock/articles';
import { Badge } from '@/components/ui/Badge';
import type { BadgeColor } from '@/components/ui/Badge';
import type { Article } from '@/lib/types';

const CATEGORIES = ['ALL', 'QUANT RESEARCH', 'HARDWARE PHYSICS', 'GRID PHYSICS', 'WHITE PAPER', 'APPLIED CRYPTO'] as const;

export default function ArticlesPage() {
  const [filter, setFilter] = useState<string>('ALL');
  const filtered: readonly Article[] = filter === 'ALL' ? ARTICLES : ARTICLES.filter(a => a.category === filter);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-mono mb-2">Knowledge Base</p>
        <h1 className="text-3xl font-bold text-white">Research & Whitepapers</h1>
        <p className="text-slate-400 mt-2 text-sm">Quantitative research, hardware physics, and applied cryptography behind Sovereign-AMM.</p>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors border ${
              filter === cat ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Article grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((article) => (
          <Link key={article.slug} href={`/articles/${article.slug}`}
            className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-5 hover:border-slate-700 hover:shadow-[0_0_16px_rgba(16,185,129,0.1)] transition-all group">
            <div className="flex items-center justify-between">
              <Badge color={article.badgeColor as BadgeColor}>{article.category}</Badge>
              <span className="text-xs font-mono text-slate-500">{article.readTime} MIN READ</span>
            </div>
            <h2 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors leading-snug">{article.title}</h2>
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{article.summary}</p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono mt-auto">Read →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
