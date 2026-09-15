import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ARTICLES } from '@/lib/mock/articles';
import { Badge } from '@/components/ui/Badge';
import type { BadgeColor } from '@/components/ui/Badge';

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

interface ArticlePageProps {
  params: { slug: string };
}

export default function ArticleDetailPage({ params }: ArticlePageProps) {
  const article = ARTICLES.find((a) => a.slug === params.slug);
  if (!article) notFound();

  const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link href="/articles" className="text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors mb-6 inline-block">
        ← Research & Whitepapers
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Badge color={article.badgeColor as BadgeColor}>{article.category}</Badge>
          <span className="text-xs font-mono text-slate-500">{article.readTime} MIN READ</span>
          <span className="text-xs font-mono text-slate-600">{new Date(article.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <h1 className="text-3xl font-bold text-white leading-tight">{article.title}</h1>
        <p className="text-slate-400 mt-3 text-base leading-relaxed">{article.summary}</p>
      </div>

      {/* Pull quote */}
      <blockquote className="border-l-4 border-emerald-500 pl-5 py-2 my-8 bg-emerald-900/10 rounded-r-lg">
        <p className="text-slate-200 italic text-base leading-relaxed">&ldquo;{article.pullQuote}&rdquo;</p>
      </blockquote>

      {/* Body sections */}
      <div className="flex flex-col gap-8">
        {article.body.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-white mb-3">{section.heading}</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              {section.content.split(/`([^`]+)`/).map((part, pi) =>
                pi % 2 === 1 ? (
                  <code key={pi} className="font-mono text-xs bg-slate-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-slate-700">{part}</code>
                ) : part
              )}
            </p>
          </section>
        ))}
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-800">
          <h2 className="text-sm uppercase tracking-widest text-slate-400 font-mono mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {related.map((rel) => (
              <Link key={rel.slug} href={`/articles/${rel.slug}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition-colors group">
                <Badge color={rel.badgeColor as BadgeColor}>{rel.category}</Badge>
                <p className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors line-clamp-2">{rel.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
