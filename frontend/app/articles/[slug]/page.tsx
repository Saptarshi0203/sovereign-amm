import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ARTICLES } from '@/lib/mock/articles';
import { Badge } from '@/components/ui/Badge';
import type { BadgeColor } from '@/components/ui/Badge';
import { ArrowLeft } from 'lucide-react';

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
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[68ch]">

        {/* Back link */}
        <Link
          href="/articles"
          className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Research &amp; Whitepapers
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge color={article.badgeColor as BadgeColor}>{article.category}</Badge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {article.readTime} min read
            </span>
            <span className="font-mono text-[10px] text-slate-600">
              {new Date(article.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">{article.summary}</p>
        </div>

        {/* Hairline */}
        <div className="hairline mb-10" aria-hidden="true" />

        {/* Pull quote */}
        <blockquote className="mb-10 border-l-2 border-telemetry pl-5">
          <p className="text-slate-200 text-base italic leading-relaxed">
            &ldquo;{article.pullQuote}&rdquo;
          </p>
        </blockquote>

        {/* Body sections */}
        <div className="flex flex-col gap-8">
          {article.body.map((section, i) => (
            <section key={i}>
              <h2 className="mb-3 font-display text-xl font-bold text-white">{section.heading}</h2>
              <p className="text-slate-300 text-base leading-relaxed">
                {section.content.split(/`([^`]+)`/).map((part, pi) =>
                  pi % 2 === 1 ? (
                    <code
                      key={pi}
                      className="rounded border border-edge/50 bg-slate-800/60 px-1.5 py-0.5 font-mono text-xs text-telemetry"
                    >
                      {part}
                    </code>
                  ) : part
                )}
              </p>
            </section>
          ))}
        </div>

        {/* Hairline */}
        <div className="hairline my-10" aria-hidden="true" />

        {/* Related articles */}
        {related.length > 0 && (
          <div>
            <p className="label-caps mb-4">Related articles</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {related.map((rel) => (
                <Link
                  key={rel.slug}
                  href={`/articles/${rel.slug}`}
                  className="group flex flex-col gap-2 rounded-2xl border border-edge/40 p-4 transition-colors hover:border-edge/70"
                >
                  <Badge color={rel.badgeColor as BadgeColor}>{rel.category}</Badge>
                  <p className="text-sm font-medium text-slate-200 transition-colors group-hover:text-telemetry line-clamp-2">
                    {rel.title}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
