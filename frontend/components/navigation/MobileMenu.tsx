'use client';

import Link from 'next/link';
import { ThemeToggle } from '../ui/ThemeToggle';

interface Tab {
  label: string;
  href: string;
}

interface MobileMenuProps {
  tabs: Tab[];
  currentPath: string;
  /** Called when any menu link is clicked, so the parent can close the menu */
  onClose: () => void;
}

/**
 * MobileMenu — vertical dropdown shown on viewports < 768 px when the
 * hamburger icon is toggled.
 *
 * Requirements: 2.6, 2.7
 */
export function MobileMenu({ tabs, currentPath, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden bg-slate-900 border-t border-sky-200 dark:border-slate-800 animate-slide-down">
      <div className="px-2 pt-2 pb-3 space-y-1">
        {tabs.map((tab) => {
          const isActive =
            currentPath === tab.href ||
            currentPath.startsWith(tab.href + '/');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={onClose}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive
                  ? 'bg-sky-100 dark:bg-slate-800 text-sky-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-700 hover:text-sky-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-sky-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Theme</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
