'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { AuthButtons } from './AuthButtons';
import { OverlayMenu } from './OverlayMenu';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DatasetDrawerButton } from '../layout/DatasetDrawer';

/** All top-level navigation destinations. */
const navigationTabs: { label: string; href: string; adminOnly?: boolean; secondary?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid', href: '/grid' },
  { label: 'Battery', href: '/battery' },
  { label: 'Trade', href: '/trade' },
  { label: 'Copilot', href: '/copilot' },
  { label: 'Control', href: '/control', adminOnly: true }, // Shows in both navbar (when admin) and overlay
  // B4 FIX: These live in overlay menu only to prevent 1440px collision
  { label: 'Pricing', href: '/pricing', secondary: true },
  { label: 'About', href: '/about', secondary: true },
  { label: 'Contact', href: '/contact', secondary: true },
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
  // B4 FIX: Primary tabs exclude secondary (which live in overlay only)
  const primaryTabs = navigationTabs.filter((t) => !t.secondary);
  const visibleTabs = primaryTabs.filter((t) => !t.adminOnly || isAdmin);
  // Overlay menu gets all tabs (including secondary)
  const allTabs = navigationTabs.filter((t) => !t.adminOnly || isAdmin);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className={`sticky top-0 z-50 transition-colors ${scrolled ? 'bg-canvas/80 backdrop-blur-xl border-b border-edge/40' : 'bg-transparent border-b border-transparent'}`}>
      <nav
        className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between"
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
                  className={`px-3 py-2 text-sm font-medium transition-colors border-b ${
                    isActive ? 'text-white border-white/70' : 'text-slate-400 hover:text-white border-transparent'
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

          <button
            type="button"
            className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.28em] uppercase text-slate-300 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <span className="hidden sm:inline">Menu</span>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <OverlayMenu open={mobileMenuOpen} onClose={closeMobileMenu} tabs={allTabs} currentPath={pathname} />
    </header>
  );
}

export default Navbar;
