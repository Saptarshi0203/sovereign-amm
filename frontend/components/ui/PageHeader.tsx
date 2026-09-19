'use client';

/**
 * @file PageHeader.tsx
 * @description Terminal page header: label + H1 + subtitle + optional right-side live pills
 *
 * Usage:
 *   <PageHeader label="01" title="Dashboard" subtitle="Live order book and market data">
 *     <Badge>Live</Badge>
 *     <Badge>10 Hz</Badge>
 *   </PageHeader>
 */

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ label, title, subtitle, children, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0 flex-1">
        {label && <p className="label-caps mb-2">{label}</p>}
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base text-slate-400 sm:text-lg">
            {subtitle}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
