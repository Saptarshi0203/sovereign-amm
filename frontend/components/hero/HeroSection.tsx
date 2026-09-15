import Link from "next/link";

/**
 * HeroSection — public landing page hero.
 *
 * Requirements: 3.1 – 3.9
 * - Full-width section with bg-slate-950 background
 * - Dark geometric dot-grid background using inline SVG as CSS background-image
 * - Ambient emerald radial glow behind the headline
 * - Headline: "Deterministic Energy Markets" + "Powered by Grid Physics" in emerald-500
 * - Descriptive subheading about GLFT pricing / algorithmic market making
 * - Primary CTA: "Sign Up Now" → /register (emerald filled)
 * - Secondary CTA: "Sign In" → /login (ghost/outline)
 * - Stats bar: 3 key system stats in small monospace text
 * - Server component – no 'use client' needed
 */
export function HeroSection() {
  return (
    <section
      className="relative w-full bg-slate-950 overflow-hidden"
      aria-label="Hero section"
    >
      {/* ── Geometric dot-grid background ── */}
      {/* Inline SVG encoded as data URI: repeating 40×40 dot pattern, very low opacity */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='1' cy='1' r='1' fill='%2394a3b8'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Ambient emerald radial glow ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-start justify-center pointer-events-none"
      >
        <div
          className="w-[700px] h-[400px] rounded-full blur-3xl opacity-[0.12] mt-8"
          style={{
            background:
              "radial-gradient(ellipse at center, #10b981 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">

        {/* Badge / eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-semibold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
          10 Hz Matching Engine · Live
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display text-white mb-4 tracking-tight leading-[1.05]">
          Deterministic Energy
          <br />
          <span className="text-emerald-500">Markets</span>
        </h1>

        {/* Subtitle */}
        <p className="text-2xl sm:text-3xl font-semibold text-slate-300 mb-6">
          Powered by{" "}
          <span className="text-emerald-600 dark:text-emerald-400">Grid Physics</span>
        </p>

        {/* Descriptive subheading */}
        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Sovereign-AMM is a high-frequency limit order book for microgrid energy
          markets. Our battery-based algorithmic market maker uses the{" "}
          <abbr title="Guéant–Lehalle–Fernandez-Tapia bounded-inventory model" className="no-underline">
            GLFT
          </abbr>{" "}
          bounded-inventory model to price energy in real time — combining grid
          physics, rainflow degradation costs, and zero-knowledge solvency proofs
          for deterministic, trustless settlement.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14">
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-lg font-semibold rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 shadow-glow-emerald min-w-[180px]"
          >
            Sign Up Now
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-4 bg-transparent hover:bg-slate-800 active:bg-slate-700 text-white text-lg font-semibold rounded-lg border border-slate-600 hover:border-slate-500 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 min-w-[180px]"
          >
            Sign In
          </Link>
        </div>

        {/* Stats bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 text-xs font-mono text-slate-500">
          <span className="px-4">10 Hz Update Rate</span>
          <span className="hidden sm:block w-px h-4 bg-slate-700" aria-hidden="true" />
          <span className="px-4">GLFT Pricing Model</span>
          <span className="hidden sm:block w-px h-4 bg-slate-700" aria-hidden="true" />
          <span className="px-4">ZK Solvency Ready</span>
        </div>

      </div>
    </section>
  );
}
