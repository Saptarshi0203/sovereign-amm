import Link from 'next/link';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { Marquee } from '@/components/ui/Editorial';

const NAV_COLS = [
  {
    label: 'Terminal',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Grid', href: '/grid' },
      { label: 'Battery', href: '/battery' },
      { label: 'Trade', href: '/trade' },
      { label: 'Copilot', href: '/copilot' },
      { label: 'L2 Depth', href: '/depth' },
      { label: 'Price history', href: '/price' },
    ],
  },
  {
    label: 'Platform',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'About', href: '/about' },
      { label: 'Articles', href: '/articles' },
      { label: 'Demo mode', href: '/demo' },
    ],
  },
  {
    label: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy' },
      { label: 'Terms of service', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    label: 'Connect',
    links: [], // social icons handled separately
    social: true,
  },
] as const;

const SOCIAL = [
  { name: 'GitHub',   Icon: Github,   href: 'https://github.com/riturajbarman' },
  { name: 'Twitter',  Icon: Twitter,  href: 'https://twitter.com/sovereign_amm' },
  { name: 'LinkedIn', Icon: Linkedin, href: 'https://linkedin.com/company/sovereign-amm' },
  { name: 'Email',    Icon: Mail,     href: 'mailto:@sovereign-amm.com' },
] as const;

const MANIFESTO = 'Connecting physics with price, batteries with markets, households with the grid — every kilowatt-hour clear at the price the wires allow.';

export function Footer() {
  return (
    <footer aria-label="Site footer">
      {/* Manifesto marquee */}
      <Marquee text={MANIFESTO} />

      {/* 4-column grid */}
      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {NAV_COLS.map((col) => (
            <div key={col.label}>
              <p className="label-caps mb-4">{col.label}</p>

              {'social' in col && col.social ? (
                <div className="flex flex-col gap-3">
                  {SOCIAL.map(({ name, Icon, href }) => (
                    <a
                      key={name}
                      href={href}
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center gap-2.5 font-mono text-xs text-slate-400 transition-colors hover:text-white"
                      aria-label={name}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {name}
                    </a>
                  ))}
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="font-mono text-xs text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* Hairline + bottom strip */}
        <div className="hairline mt-10 mb-6" aria-hidden="true" />
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="font-display text-sm font-bold uppercase tracking-widest text-white"
            aria-label="Sovereign-AMM home"
          >
            SOVEREIGN-<span className="text-gradient">AMM</span>
          </Link>

          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            Sovereign-AMM v1.0.0 · Deterministic Mode ON
          </p>

          <p className="font-mono text-xs text-slate-600">
            © 2026 Sovereign-AMM · All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;