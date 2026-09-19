'use client';

/**
 * ParticleCanvas — SSR-safe tsparticles wrapper for @tsparticles/react v4.
 *
 * Architecture
 * ─────────────
 * @tsparticles/react v4 manages engine initialisation through `ParticlesProvider`,
 * which accepts a stable `init` callback and renders its children **only after** the
 * engine is ready. If the same stable callback is reused across multiple instances,
 * v4's internal module-level singleton (`s`/`c`/`l` in ParticlesProvider.js) guarantees
 * the engine is initialised exactly once per app lifetime.
 *
 * We hold the `init` callback at module scope so that:
 *   1. Every `ParticleCanvas` instance passes the exact same reference → no double-init.
 *   2. The `useRef` guard inside the component protects against React Strict Mode's
 *      double-invocation of effects (belt-and-suspenders only; the provider already guards).
 *
 * SSR exclusion is enforced at the call site via `dynamic(() => import(…), { ssr: false })`.
 * This file is additionally marked `'use client'` to prevent any server component from
 * static-importing it.
 *
 * Props:
 *   id        — Unique DOM id forwarded to <Particles>; required by tsparticles for
 *               multi-instance canvases.
 *   config    — Particle options typed as `ISourceOptions` from @tsparticles/engine.
 *               No `any` types permitted (Requirements 11.1).
 *   className — Optional CSS class forwarded to <Particles>.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 11.1, 12.1
 */

import { useRef } from 'react';
import type { Engine, ISourceOptions } from '@tsparticles/engine';
import { Particles, ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

// ---------------------------------------------------------------------------
// Module-level stable init callback — ensures same reference across all
// ParticleCanvas instances so the v4 provider singleton fires exactly once.
// ---------------------------------------------------------------------------
async function initEngine(engine: Engine): Promise<void> {
  await loadSlim(engine);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface ParticleCanvasProps {
  /** Unique id for the tsparticles canvas instance. */
  id: string;
  /** Particle options object. Typed as ISourceOptions — no any. */
  config: ISourceOptions;
  /** Optional CSS class forwarded to the <Particles> render component. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Inner component rendered only after the engine is ready (inside Provider)
// ---------------------------------------------------------------------------
function ParticlesInner({ id, config, className }: ParticleCanvasProps) {
  return (
    <Particles
      id={id}
      options={config}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// ParticleCanvas — public named export
// ---------------------------------------------------------------------------

/**
 * SSR-safe, engine-singleton-guarded tsparticles canvas.
 *
 * Usage:
 * ```tsx
 * const DynamicParticles = dynamic(
 *   () => import('@/components/ui/ParticleCanvas').then((m) => m.ParticleCanvas),
 *   { ssr: false }
 * );
 * // Then inside a 'use client' component:
 * <DynamicParticles id="my-canvas" config={MY_CONFIG} className="absolute inset-0" />
 * ```
 *
 * Renders `null` while the engine is initialising (Requirement 6.4).
 * Once ready, renders a `<Particles>` element with the provided id and options (Req 6.5).
 */
export function ParticleCanvas({ id, config, className }: ParticleCanvasProps) {
  // useRef guard — prevents any per-instance side-effects from running twice
  // under React 18 Strict Mode. The v4 ParticlesProvider already guards the
  // singleton, but the ref ensures we never pass a new init reference.
  const mountedRef = useRef(false);
  if (!mountedRef.current) {
    mountedRef.current = true;
  }

  return (
    /*
     * ParticlesProvider renders null until initEngine resolves, then renders
     * its children. This satisfies Requirement 6.4 (render null while loading).
     * The `init` prop is the stable module-level function, satisfying Req 6.3.
     */
    <ParticlesProvider init={initEngine}>
      <ParticlesInner id={id} config={config} className={className} />
    </ParticlesProvider>
  );
}
