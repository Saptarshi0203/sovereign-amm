'use client';

import Link from 'next/link';
import { ThemeToggle } from '../ui/ThemeToggle';

interface Tab {
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface MobileMenuProps {
  tabs: Tab[];
  currentPath: string;
  onClose: () => void;
}

/**
 * Mobile navigation drawer — E8 midnight aesthetic.
 * Slides down below the Navbar, full-width, with glassmorphic bg.
 */
export function MobileMenu({ tabs, currentPath, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden animate-slide-down border-t border-[#162435]/80 bg-[#0b131b]/98 backdrop-blur-xl">
      <nav className="px-4 py-3 flex flex-col gap-0.5" aria-label="Mobile navigation">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.href || currentPath.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onClose}
              aria-current={isActive ? 'page' : undefined}
              className={`
                flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-cyan-500/10 text-slate-50 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#162435]/60 border border-transparent'
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between px-5 py-3 border-t border-[#162435]/60">
        <span className="text-xs text-slate-500 font-mono tracking-widest">THEME</span>
        <ThemeToggle />
      </div>
    </div>
  );
}

export default MobileMenu;
