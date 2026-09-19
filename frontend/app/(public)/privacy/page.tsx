import { SectionLabel } from '@/components/ui/Editorial';

const SECTIONS = [
  {
    title: '1. Introduction',
    content: 'Welcome to Sovereign-AMM. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this policy, please contact us.',
  },
  {
    title: '2. Information We Collect',
    content: 'The personal information we collect depends on the context of your interactions with us:',
    list: [
      'Contact information such as email addresses and phone numbers.',
      'Usage data and telemetry related to platform interactions.',
      'Information you provide when communicating with our team.',
    ],
  },
  {
    title: '3. How We Use Your Information',
    content: 'We use personal information for business purposes:',
    list: [
      'To provide, operate, and maintain our platform.',
      'To improve, personalise, and expand our platform features.',
      'To communicate with you, directly or through partners, including for customer service and updates.',
    ],
  },
  {
    title: '4. Data Security',
    content: 'We implement security measures to maintain the safety of your personal information. However, no method of transmission over the internet is 100% secure.',
  },
  {
    title: '5. Contact Us',
    content: null,
    contact: true,
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <SectionLabel n="Legal">Privacy Policy</SectionLabel>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-slate-400">How we collect, use, and protect your information.</p>

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
                  If you have questions or comments about this notice, email us at{' '}
                  <a href="mailto:@sovereign-amm.com" className="text-telemetry hover:underline underline-offset-4">
                    @sovereign-amm.com
                  </a>
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
