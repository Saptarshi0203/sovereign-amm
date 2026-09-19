'use client';

/**
 * @file Button.tsx
 * @description General-purpose button with three design-system variants.
 *
 * Variants:
 *   primary — emerald fill, white text (default)
 *   ghost   — transparent with slate border; subtle hover fill
 *   danger  — rose fill, white text
 *
 * The disabled prop adds `opacity-50 cursor-not-allowed pointer-events-none`
 * so the button is visually dimmed and unclickable in a single pass.
 *
 * Requirements addressed: 30.1, 30.2
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported visual variants for the Button component. */
export type ButtonVariant = 'primary' | 'ghost' | 'danger';

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

const VARIANT_MAP: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  ghost:   'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white',
  danger:  'bg-rose-700 hover:bg-rose-600 text-white',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ButtonProps {
  /** Visual style variant. Defaults to `'primary'`. */
  variant?: ButtonVariant;
  /** When true, the button is dimmed and non-interactive. */
  disabled?: boolean;
  /** Click handler. Not fired when `disabled` is true (pointer-events-none). */
  onClick?: () => void;
  /** Button label or nested elements. */
  children: React.ReactNode;
  /** Additional Tailwind classes merged via cn(). */
  className?: string;
  /** HTML button type attribute. Defaults to `'button'`. */
  type?: 'button' | 'submit';
}

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

/**
 * General-purpose button with primary / ghost / danger variants.
 *
 * @example
 * <Button onClick={handleLogin}>Sign In</Button>
 * <Button variant="ghost" onClick={close}>Cancel</Button>
 * <Button variant="danger" onClick={confirmDelete}>Delete</Button>
 */
export function Button({
  variant = 'primary',
  disabled = false,
  onClick,
  children,
  className,
  type = 'button',
}: ButtonProps): React.ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
        VARIANT_MAP[variant],
        disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  );
}
