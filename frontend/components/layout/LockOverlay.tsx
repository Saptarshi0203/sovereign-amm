'use client';

interface LockOverlayProps {
  title: string;
  body: string;
  ctaLabel: string;
  children: React.ReactNode;
}

/**
 * Historical gate wrapper. The Demo Sandbox is now fully unlocked for
 * anonymous visitors (every card is interactive against the 24 h demo
 * stream and a local ₹100,000 paper wallet), so this renders its children
 * directly with no blur, overlay or pointer-events lock. Kept as a no-op so
 * existing call sites and tests keep compiling.
 */
export function LockOverlay({ children }: LockOverlayProps) {
  return <>{children}</>;
}

export default LockOverlay;
