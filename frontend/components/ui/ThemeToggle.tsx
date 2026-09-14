"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * ThemeToggle — pill button with 180° spin transition.
 * Sun scales in on light mode, Moon on dark. Uses CSS-only transitions
 * so it works without Framer Motion and has zero layout shift after mount.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // SSR placeholder — matches rendered size exactly to avoid layout shift
  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-full bg-midnight-700/50 border border-midnight-500/50" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`
        relative flex items-center justify-center w-9 h-9 rounded-full
        border transition-all duration-300 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-cyan-500/60 overflow-hidden
        ${isDark
          ? "bg-midnight-700/70 border-midnight-500/60 hover:border-cyan-500/40 hover:bg-midnight-600/80 hover:shadow-glow-cyan"
          : "bg-white border-sky-200 hover:border-sky-400 hover:bg-sky-50 shadow-sm"
        }
      `}
    >
      {/* Sun — visible in light mode */}
      <Sun
        className={`
          h-4 w-4 absolute transition-all duration-500
          ${isDark
            ? "scale-0 rotate-90 opacity-0"
            : "scale-100 rotate-0 opacity-100 text-sky-600"
          }
        `}
        aria-hidden="true"
      />
      {/* Moon — visible in dark mode */}
      <Moon
        className={`
          h-4 w-4 absolute transition-all duration-500
          ${isDark
            ? "scale-100 rotate-0 opacity-100 text-cyan-400"
            : "scale-0 -rotate-90 opacity-0"
          }
        `}
        aria-hidden="true"
      />
    </button>
  );
}

export default ThemeToggle;
