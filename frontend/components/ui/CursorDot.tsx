'use client';

/**
 * @file CursorDot.tsx
 * @description Custom cursor dot (pointer:fine only), mix-blend-difference, grows on interactive hover.
 * Follows the mouse smoothly with spring physics.
 *
 * Usage:
 *   <CursorDot /> // in layout
 */

import { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useReducedMotion } from 'framer-motion';

export function CursorDot() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const reduce = useReducedMotion();
  const cursorX = useSpring(0, { stiffness: 500, damping: 28 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28 });
  const rafRef = useRef<number>();

  useEffect(() => {
    // Only show on pointer:fine devices (not touch)
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasPointer || reduce) return;

    setIsVisible(true);

    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive =
        target.tagName === 'A' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.hasAttribute('role') && ['button', 'link', 'tab'].includes(target.getAttribute('role')!);
      setIsHovering(interactive);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onEnter, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onEnter);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [cursorX, cursorY, reduce]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed top-0 left-0 z-[200] h-3 w-3 rounded-full bg-white mix-blend-difference"
      style={{
        x: cursorX,
        y: cursorY,
        translateX: '-50%',
        translateY: '-50%',
        scale: isHovering ? 2 : 1,
      }}
      transition={{ scale: { duration: 0.15 } }}
      aria-hidden="true"
    />
  );
}

export default CursorDot;
