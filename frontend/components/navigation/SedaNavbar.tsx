'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { AuthButtons } from './AuthButtons';
import { SedaMobileDrawer } from './SedaMobileDrawer';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DatasetDrawerButton } from '../layout/DatasetDrawer';

/** SEDA-style navigation destinations - clean and minimal */
const navigationTabs: { label: string; href: string; adminOnly?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid', href: '/grid' },
  { label: 'Battery', href: '/battery' },
  { label: 'Trade', href: '/trade' },
  { label: 'Copilot', href: '/copilot' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Control', href: '/control', adminOnly: true },
];

/**
 * SEDA-style Navbar — clean horizontal navigation inspired by SEDA's design.
 *
 * - Logo "SOVEREIGN-AMM" links to "/"
 * - Clean horizontal tabs with subtle hover states
 * - Mobile hamburger that opens a slide-out drawer (not full-screen overlay)
 * - Consistent with SEDA's clean, minimal aesthetic
 *
 * Replaces the existing OverlayMenu system completely.
 */
export function SedaNavbar() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const visibleTabs = navigationTabs.filter((t) => !t.adminOnly || isAdmin);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileDrawer = () => setMobileDrawerOpen(false);

  return (
    <>
      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/90 dark:bg-canvas/90 backdrop-blur-xl border-b border-slate-200/20 dark:border-edge/20 shadow-sm' 
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* ── Left: Logo ──────────────────────────────────────────────────── */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-wider text-slate-900 dark:text-white uppercase font-display transition-colors hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Sovereign-AMM home"
            >
              <span 
                aria-hidden="true" 
                className="inline-block w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md" 
              />
              <span>SOVEREIGN-<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500">AMM</span></span>
            </Link>
          </div>

          {/* ── Center: Desktop Navigation (hidden on mobile) ───────────────── */}
          <div className="hidden lg:flex items-center space-x-1">
            {visibleTabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                pathname.startsWith(tab.href + '/');

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    isActive 
                      ? 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* ── Right: Actions ────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            {/* Dataset upload drawer (desktop only) */}
            <div className="hidden lg:block">
              <DatasetDrawerButton />
            </div>

            {/* Desktop theme toggle */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* Auth buttons */}
            <AuthButtons />

            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileDrawerOpen}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <SedaMobileDrawer 
        open={mobileDrawerOpen} 
        onClose={closeMobileDrawer} 
        tabs={visibleTabs} 
        currentPath={pathname} 
      />
    </>
  );
}

export default SedaNavbar;