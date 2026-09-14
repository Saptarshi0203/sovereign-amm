'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap, Activity } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';
import { useStore } from '@/lib/store';
import { AuthButtons } from './AuthButtons';
import { MobileMenu } from './MobileMenu';
import { ThemeToggle } from '../ui/ThemeToggle';
import { DatasetDrawerButton } from '../layout/DatasetDrawer';

const navigationTabs: { label: string; href: string; adminOnly?: boolean }[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Grid',      href: '/grid' },
  { label: 'Battery',   href: '/battery' },
  { label: 'Trade',     href: '/trade' },
  { label: 'Control',   href: '/control', adminOnly: true },
  { label: 'Pricing',   href: '/pricing' },
  { label: 'About',     href: '/about' },
  { label: 'Contact',   href: '/contact' },
];

/**
 * Navbar — E8-style sticky header.
 *
 * Dark mode:  deep midnight teal bg (#0b131b / bg-[#0b131b])
 *             with a 1px bottom border in midnight-500
 *             + a subtle cyan glow line along the bottom edge.
 * Light mode: pure white bg with sky-200 bottom border.
 *
 * Features:
 *  - SOVEREIGN-AMM wordmark with cyan accent on hover
 *  - Desktop tabs with active indicator (bottom underline + bg tint)
 *  - Engine 10 Hz live status pill (reads dataSource from store)
 *  - ThemeToggle pill (Sun ↔ Moon)
 *  - Auth area + mobile hamburger
 */
export function Navbar() {
  const pathname  = usePathname();
  const isAdmin   = useAuthStore((s) => s.isAdmin);
  const live      = useStore((s) => s.dataSource === 'live');
  const tick      = useStore((s) => s.tickNumber);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const visibleTabs = navigationTabs.filter((t) => !t.adminOnly || isAdmin);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-50 transition-all duration-300
        bg-[#0b131b]/95 dark:bg-[#0b131b]/95
        light:bg-white/95
        backdrop-blur-xl
        border-b border-[#162435]/90 dark:border-[#162435]/90
        light:border-sky-200/80
        ${scrolled
          ? 'shadow-[0_1px_0_rgba(0,242,254,0.08),0_4px_24px_rgba(0,0,0,0.4)]'
          : ''
        }
      `}
    >
      {/* Bottom cyan glow edge */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, transparent 0%, rgba(0,242,254,0.18) 30%, rgba(0,242,254,0.18) 70%, transparent 100%)',
        }}
      />

      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4"
        aria-label="Main navigation"
      >
        {/* ── Left: Logo + tabs ───────────────────────────────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm font-bold tracking-[0.2em] uppercase font-display whitespace-nowrap"
            aria-label="Sovereign-AMM home"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40 transition-all duration-200">
              <Zap className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
            </span>
            <span className="text-slate-50 dark:text-slate-50 light:text-sky-950 group-hover:text-cyan-400 transition-colors duration-200">
              SOVEREIGN
              <span className="text-cyan-400">-AMM</span>
            </span>
          </Link>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-0.5" role="navigation">
            {visibleTabs.map((tab) => {
              const isActive =
                pathname === tab.href || pathname.startsWith(tab.href + '/');
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    relative px-3 py-2 rounded-lg text-xs font-medium tracking-wide
                    transition-all duration-150
                    ${isActive
                      ? [
                          // Active: cyan underline + subtle tint
                          'text-slate-50 dark:text-slate-50 light:text-sky-900',
                          'bg-cyan-500/10 dark:bg-cyan-500/10 light:bg-sky-100',
                        ].join(' ')
                      : [
                          'text-slate-400 dark:text-slate-400 light:text-slate-600',
                          'hover:text-slate-100 dark:hover:text-slate-100 light:hover:text-sky-900',
                          'hover:bg-[#162435]/60 dark:hover:bg-[#162435]/60 light:hover:bg-sky-50',
                        ].join(' ')
                    }
                  `}
                >
                  {tab.label}
                  {/* Active bottom indicator */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3 right-3 h-px rounded-full bg-cyan-500/70"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right: status pill + controls ──────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {/* Engine status pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono tracking-widest
            border-emerald-700/40 bg-emerald-900/15 text-emerald-400
            dark:border-emerald-700/40 dark:bg-emerald-900/15 dark:text-emerald-400
            light:border-emerald-300 light:bg-emerald-50 light:text-emerald-700"
          >
            <Activity className="w-3 h-3" aria-hidden="true" />
            <span className="flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
                aria-hidden="true"
              />
              ENGINE {live ? '10 Hz' : 'SIM'} · T{tick.toLocaleString()}
            </span>
          </div>

          {/* Dataset drawer */}
          <div className="hidden md:block">
            <DatasetDrawerButton />
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Auth section */}
          <AuthButtons />

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-[#162435]/80 text-slate-400 hover:text-slate-100 hover:bg-[#162435]/60 transition-colors"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen
              ? <X className="h-5 w-5" aria-hidden="true" />
              : <Menu className="h-5 w-5" aria-hidden="true" />
            }
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu">
          <MobileMenu
            tabs={visibleTabs}
            currentPath={pathname}
            onClose={() => setMobileMenuOpen(false)}
          />
        </div>
      )}
    </header>
  );
}

export default Navbar;
