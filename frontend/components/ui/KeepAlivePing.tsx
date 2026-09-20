'use client';

import { useEffect } from 'react';

export function KeepAlivePing() {
  useEffect(() => {
    // Fire-and-forget ping to wake up the Render.com backend
    // We swallow errors because this is a silent background task
    try {
      const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
      fetch(`${API_BASE}/api/health`, { method: 'GET', keepalive: true }).catch(() => {});
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
