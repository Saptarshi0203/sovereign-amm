'use client';

import React from 'react';
import { useTheme } from 'next-themes';

/**
 * Brand logo component for Sovereign-AMM application.
 * 
 * Features:
 * - Dual-layer "S" blade design with gradients
 * - Theme-aware glow effects (dark mode only)
 * - Three variants: full wordmark, mark-only, app icon
 * - Responsive sizing: sm (navbar), md (drawer), lg (hero)
 * 
 * @example
 * // Full logo in navbar
 * <Logo variant="full" size="sm" showTagline={false} />
 * 
 * @example
 * // Mark-only in auth drawer
 * <Logo variant="mark-only" size="md" />
 */

interface LogoProps {
  variant?: 'full' | 'mark-only' | 'icon-app';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

interface LogoMarkProps {
  className?: string;
  withGlow?: boolean;
}

/**
 * Dual-blade "S" mark with gradient fills.
 * Top blade: Violet → Indigo (#a855f7 → #6366f1)
 * Bottom blade: Cyan → Sky (#00f2fe → #0284c7)
 */
export const LogoMark = ({ className = "w-8 h-8", withGlow = false }: LogoMarkProps) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`${className} ${withGlow ? 'drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]' : ''} transition-all duration-300`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="topBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <linearGradient id="bottomBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00f2fe" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    {/* Top Curved Blade - Violet gradient */}
    <path 
      d="M25 15 Q25 12, 28 12 H75 Q85 12, 88 20 Q90 25, 85 32 L50 65 Q45 70, 38 70 H28 Q18 70, 15 62 Q12 57, 17 50 L25 40 Z" 
      fill="url(#topBladeGrad)" 
      className="transition-all duration-300"
    />
    {/* Bottom Curved Blade - Cyan gradient */}
    <path 
      d="M75 85 Q75 88, 72 88 H25 Q15 88, 12 80 Q10 75, 15 68 L50 35 Q55 30, 62 30 H72 Q82 30, 85 38 Q88 43, 83 50 L75 60 Z" 
      fill="url(#bottomBladeGrad)" 
      className="transition-all duration-300"
    />
  </svg>
);

/**
 * Wordmark: "SOVEREIGN-AMM"
 * SOVEREIGN- in solid color (theme-aware)
 * AMM in gradient (cyan → violet)
 */
interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LogoWordmark = ({ size = 'sm', className = '' }: LogoWordmarkProps) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl md:text-5xl',
  };

  return (
    <div className={`font-display font-bold tracking-wider uppercase ${sizeClasses[size]} ${className}`}>
      <span className="text-slate-900 dark:text-white transition-colors duration-300">
        SOVEREIGN-
      </span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-violet-500">
        AMM
      </span>
    </div>
  );
};

/**
 * Optional tagline: "SOLAR ENERGY TRADING PLATFORM"
 * Rendered in small, wide-tracked Aldrich font
 */
interface LogoTaglineProps {
  className?: string;
}

const LogoTagline = ({ className = '' }: LogoTaglineProps) => (
  <div className={`font-display text-[9px] md:text-[10px] tracking-[0.25em] text-slate-500 dark:text-slate-400 uppercase mt-1 ${className}`}>
    SOLAR ENERGY TRADING PLATFORM
  </div>
);

/**
 * Main Logo Component
 * Combines mark, wordmark, and optional tagline based on variant and size
 */
export default function Logo({ 
  variant = 'full', 
  size = 'sm', 
  showTagline = false,
  className = '' 
}: LogoProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Size mappings for logo mark
  const markSizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12 md:w-16 md:h-16',
    lg: 'w-20 h-20 md:w-28 md:h-28',
  };

  // Icon-app variant: mark only, optimized for app icons/favicons
  if (variant === 'icon-app') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoMark className={markSizes[size]} withGlow={false} />
      </div>
    );
  }

  // Mark-only variant: just the dual-blade symbol with glow in dark mode
  if (variant === 'mark-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoMark className={markSizes[size]} withGlow={isDark} />
      </div>
    );
  }

  // Full variant: mark + wordmark + optional tagline
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className={markSizes[size]} withGlow={isDark} />
      <div className="flex flex-col">
        <LogoWordmark size={size} />
        {showTagline && <LogoTagline />}
      </div>
    </div>
  );
}

// Named export for convenience
export { Logo };
