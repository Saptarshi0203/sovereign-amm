'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { AuthButtons } from './AuthButtons';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DatasetDrawerButton } from '../layout/DatasetDrawer';

/** All top-level navigation destinations. */
const navigationTabs: { label: string; href: string; adminOnly?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid', href: '/grid' },
  { label: 'Battery', href: '/battery' },
  { label: 'Trade', href: '/trade' },
  { label: 'Control', href: '/control', adminOnly: true },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/**
 * Navbar — global site header fixed at 64 px height.
 *
 * - Logo "SOVEREIGN-AMM" links to "/"
 * - Desktop tabs with active-state highlighting via usePathname()
 * - AuthButtons: DEMO MODE badge + Sign In under a guest session, Sign Out
 *   for a real session (Google OAuth / password)
 * - Mobile hamburger below 768 px that toggles MobileMenu
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9, 10.12
 */
export function Navbar() {
  const pathname = usePathname();
  // The Control tab renders strictly for admin JWTs held in the persisted auth store.
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const visibleTabs = navigationTabs.filter((t) => !t.adminOnly || isAdmin);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-canvas/70 backdrop-blur-xl border-b border-edge/30">
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* ── Left: Logo ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-widest text-white uppercase font-display whitespace-nowrap"
            aria-label="Sovereign-AMM home"
          >
            <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-sm bg-brand-gradient shadow-glow-violet" />
            <span>SOVEREIGN-<span className="text-gradient">AMM</span></span>
          </Link>

          {/* ── Desktop tabs (hidden on mobile) ───────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            {visibleTabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                pathname.startsWith(tab.href + '/');

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-violet-500/15 text-white border border-violet-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right: Auth area + hamburger ────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Dataset upload drawer (control room) */}
          <div className="hidden md:block">
            <DatasetDrawerButton />
          </div>

          {/* Desktop theme toggle */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Auth / user section — demo badge, sign in, or signed-in user */}
          <AuthButtons />

          {/* Hamburger — visible only on mobile */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-900 dark:hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* ── Mobile menu dropdown ────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div id="mobile-menu">
          <MobileMenu
            tabs={visibleTabs}
            currentPath={pathname}
            onClose={closeMobileMenu}
          />
        </div>
      )}
    </header>
  );
}

export default Navbar;
