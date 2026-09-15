'use client';

import { useEffect, useState } from 'react';
import { Database, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { DatasetUpload } from '@/components/panels/DatasetUpload';
import { ClockSyncBadge } from '@/components/ui/ClockSyncBadge';

/** Navbar button + slide-in drawer for the custom 24 h dataset upload. */
export function DatasetDrawerButton() {
  const [open, setOpen] = useState(false);
  const playback = useStore((s) => s.playback);
  const live = useStore((s) => s.dataSource === 'live');
  const isAdmin = useStore((s) => s.isAdmin);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!isAdmin) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors ${
          live && playback?.active ? 'border-sky-700/60 text-sky-700 dark:text-sky-300 hover:bg-sky-900/20' : 'border-slate-700 text-slate-400 hover:text-white'
        }`}
        title="Upload a custom 24 h dataset / playback status"
      >
        <Database className="w-3.5 h-3.5" />
        <span className="hidden xl:inline whitespace-nowrap">{live && playback?.active ? playback.name.slice(0, 18) : 'Dataset'}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Dataset playback">
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="w-full sm:w-[460px] h-full bg-slate-900 border-l border-slate-800 flex flex-col overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-white">Control room · dataset</h2>
                <ClockSyncBadge />
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <DatasetUpload compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DatasetDrawerButton;
