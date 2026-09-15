'use client';

/**
 * @file MarketClockProvider.tsx
 * @description Thin wrapper that mounts the `useMarketClock` hook inside a
 * Client Component boundary, allowing `app/layout.tsx` to remain a pure
 * Server Component.
 *
 * ## Why a dedicated component?
 * React's rules of hooks require that hooks using browser APIs (like
 * `window.matchMedia` and `setInterval`) live in Client Components. However,
 * `app/layout.tsx` is a Server Component and cannot use hooks directly.
 * `MarketClockProvider` solves this by being the narrowest possible Client
 * boundary: it only calls `useMarketClock()` and renders `{children}` as-is,
 * adding zero extra DOM nodes.
 *
 * @example
 * ```tsx
 * // app/layout.tsx (Server Component)
 * export default function RootLayout({ children }: { children: React.ReactNode }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <MarketClockProvider>{children}</MarketClockProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import React from 'react';
import { useMarketClock } from '@/lib/hooks/useMarketClock';

/**
 * Client Component wrapper that starts the 10 Hz market simulation clock.
 *
 * Render this once at the root of the application tree. It calls
 * `useMarketClock()` for its side-effect and renders children transparently
 * inside a React Fragment — no extra DOM elements are introduced.
 *
 * @param children - The React subtree to render unchanged.
 * @returns A React Fragment containing `children`.
 */
export function MarketClockProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  useMarketClock();
  return <>{children}</>;
}
