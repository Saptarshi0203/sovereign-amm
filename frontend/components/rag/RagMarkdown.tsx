'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/** Markdown + KaTeX renderer shared by the drawer and the /copilot page. */
export function RagMarkdown({ content, compact = false }: { content: string; compact?: boolean }) {
  return (
    <div className={`rag-md ${compact ? 'rag-md-compact' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, throwOnError: false }]]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-violet-700 dark:text-violet-300 underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const block = /language-/.test(className ?? '') || String(children).includes('\n');
            return block ? (
              <pre className="my-2 overflow-x-auto rounded-lg border border-edge/40 bg-slate-800/60 p-3 text-[12px] font-mono leading-relaxed">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="rounded bg-slate-800/60 px-1 py-0.5 font-mono text-[0.85em] text-telemetry">{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default RagMarkdown;
