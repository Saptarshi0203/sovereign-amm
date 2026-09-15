'use client';

/**
 * @file EmptyState.tsx
 * @description Empty list/table placeholder with optional icon and action.
 *
 * Usage:
 *   <EmptyState
 *     icon={<Inbox />}
 *     message="No orders yet"
 *     action={<button>Create order</button>}
 *   />
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  submessage?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, message, submessage, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-edge/60 text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-400">{message}</p>
      {submessage && <p className="mt-1 text-xs text-slate-500">{submessage}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
