'use client';

/**
 * @file Toast.tsx
 * @description Fixed bottom-right notification toast with auto-dismiss and
 * slide-up entrance animation.
 *
 * ## Toast component
 * Renders a single notification. Auto-dismisses after 3 000 ms by calling
 * `onDismiss`. Provides a manual close button.
 *
 * Animation:
 *   - Mounts with `opacity-0 translate-y-4`
 *   - Transitions to `opacity-100 translate-y-0` after one rAF tick
 *   - Uses `transition-all duration-300 ease-out`
 *
 * ## useToast hook
 * Manages toast visibility state in a parent component. Returns:
 *   `{ show, message, type, visible }`
 *
 * where `show(message, type?)` triggers the toast and `visible` drives
 * conditional rendering of `<Toast>`.
 *
 * Requirements addressed: 30.1, 30.6, 29.2
 */

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Toast semantic type — controls border and text colour. */
export type ToastType = 'success' | 'error';

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastProps {
  /** Notification message to display. */
  message: string;
  /** Visual type; defaults to `'success'`. */
  type?: ToastType;
  /** Called when the toast should be removed (auto after 3 s, or on close click). */
  onDismiss?: () => void;
}

/**
 * Fixed bottom-right toast notification with slide-up entrance animation.
 * Auto-dismisses after 3 000 ms.
 *
 * @example
 * {visible && (
 *   <Toast message="Settings saved." type="success" onDismiss={() => setVisible(false)} />
 * )}
 */
export function Toast({
  message,
  type = 'success',
  onDismiss,
}: ToastProps): React.ReactElement {
  // Drive the CSS entrance animation: start hidden, reveal after paint.
  const [visible, setVisible] = useState(false);

  // Slide-in: flip `visible` on the next animation frame so the transition fires.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-dismiss after 3 s.
  useEffect(() => {
    const id = setTimeout(() => {
      onDismiss?.();
    }, 3000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const isSuccess = type === 'success';

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        // Positioning
        'fixed bottom-6 right-6 z-50',
        // Shape & spacing
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        'max-w-sm w-full',
        // Entrance animation
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        // Colour scheme
        isSuccess
          ? 'bg-slate-900 border-emerald-700 text-emerald-600 dark:text-emerald-400'
          : 'bg-slate-900 border-rose-700 text-rose-600 dark:text-rose-400',
      )}
    >
      {/* Message */}
      <p className="flex-1 text-sm font-mono">{message}</p>

      {/* Close button */}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
        className={cn(
          'shrink-0 text-lg leading-none transition-opacity hover:opacity-70',
          isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
        )}
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useToast
// ---------------------------------------------------------------------------

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

interface UseToastReturn {
  /** Show a toast with the given message and optional type. */
  show: (message: string, type?: ToastType) => void;
  /** Current toast message. */
  message: string;
  /** Current toast type. */
  type: ToastType;
  /** Whether the toast is currently visible. Use to conditionally render `<Toast>`. */
  visible: boolean;
  /** Manually dismiss the toast. */
  dismiss: () => void;
}

/**
 * Hook that manages toast visibility state.
 *
 * @example
 * function ContactForm() {
 *   const toast = useToast();
 *
 *   const handleSubmit = () => {
 *     submitForm();
 *     toast.show('Message sent!', 'success');
 *   };
 *
 *   return (
 *     <>
 *       <form onSubmit={handleSubmit}>...</form>
 *       {toast.visible && (
 *         <Toast message={toast.message} type={toast.type} onDismiss={toast.dismiss} />
 *       )}
 *     </>
 *   );
 * }
 */
export function useToast(): UseToastReturn {
  const [state, setState] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  });

  const show = useCallback((message: string, type: ToastType = 'success') => {
    setState({ message, type, visible: true });
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return {
    show,
    message: state.message,
    type: state.type,
    visible: state.visible,
    dismiss,
  };
}
