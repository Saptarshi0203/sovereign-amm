import { SectionLabel } from '@/components/ui/Editorial';

const SECTIONS = [
  {
    title: '1. Agreement to Terms',
    content: 'By accessing or using Sovereign-AMM, you agree to be bound by these Terms of Service. If you do not agree with all of these terms, you are prohibited from using the site and our services and must discontinue use immediately.',
  },
  {
    title: '2. Intellectual Property Rights',
    content: 'Unless otherwise indicated, the website and its source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics are our proprietary property and are protected by applicable intellectual property laws and treaties.',
  },
  {
    title: '3. User Representations',
    content: 'By using the website, you represent and warrant that:',
    list: [
      'All information you submit will be true, accurate, current, and complete.',
      'You will maintain the accuracy of such information and promptly update it as necessary.',
      'You have the legal capacity and agree to comply with these Terms of Service.',
      'You will not access the website through automated or non-human means, unless authorised.',
      'You will not use the website for any illegal or unauthorised purpose.',
    ],
  },
  {
    title: '4. Modifications and Interruptions',
    content: 'We reserve the right to change, modify, or remove the contents of the website at any time or for any reason at our sole discretion without notice. We will not be liable to you or any third party for any modification, suspension, or discontinuance of the website.',
  },
  {
    title: '5. Contact Information',
    content: null,
    contact: true,
  },
] as const;

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <SectionLabel n="Legal">Terms of Service</SectionLabel>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-slate-400">Your rights and responsibilities when using Sovereign-AMM.</p>

        <div className="hairline mt-8 mb-10" aria-hidden="true" />

        <div className="flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title} aria-label={s.title}>
              <h2 className="font-display text-xl font-bold text-white mb-3">{s.title}</h2>
              {s.content && <p className="text-slate-300 leading-relaxed">{s.content}</p>}
              {'list' in s && s.list && (
                <ul className="mt-3 space-y-2 pl-4">
                  {s.list.map((item) => (
                    <li key={item} className="flex gap-3 text-slate-300">
                      <span className="mt-1 text-slate-600" aria-hidden="true">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {'contact' in s && s.contact && (
                <p className="text-slate-300">
                  To resolve a complaint or receive further information, contact us at{' '}
                  <a href="mailto:@sovereign-amm.com" className="text-telemetry hover:underline underline-offset-4">
                    @sovereign-amm.com
                  </a>{' '}
                  or call +91 99074 18830.
                </p>
              )}
              <div className="hairline mt-8" aria-hidden="true" />
            </section>
          ))}
        </div>

        <p className="mt-6 font-mono text-xs text-slate-600">
          Last updated: September 2026
        </p>
      </div>
    </div>
  );
}
