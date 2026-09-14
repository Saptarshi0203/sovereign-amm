'use client';

import { useEffect, useRef, useState } from 'react';
import { Database, Download, Upload } from 'lucide-react';
import { useStore } from '@/lib/store';
import { activateRun, deactivatePlayback, fetchRuns, regenerateSample, sampleCsvUrl, uploadDatasetCsv, type RunMeta } from '@/lib/live/session';

/**
 * "Upload Custom 24H Dataset" control: file picker with upload progress,
 * active-dataset banner, and the list of stored runs (switchable).
 *
 * CSV schema: timestamp, bus_id, house_count, solar_mw, demand_mw,
 * micro_price, battery_soc_pct, grid_frequency_hz — one row per 10 s.
 */
export function DatasetUpload({ compact = false, title = 'Playback dataset' }: { compact?: boolean; title?: string }) {
  const playback = useStore((s) => s.playback);
  const isAdmin = useStore((s) => s.isAdmin);
  const live = useStore((s) => s.dataSource === 'live') && isAdmin;
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunMeta[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshRuns = async () => {
    try {
      setRuns(await fetchRuns());
    } catch {
      /* offline */
    }
  };

  useEffect(() => {
    if (live) void refreshRuns();
  }, [live, playback?.run_id]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    setProgress(0);
    try {
      const res = await uploadDatasetCsv(file, '', setProgress);
      setMsg(`Loaded "${res.name}" — ${res.rows.toLocaleString()} rows (${res.rows_skipped} skipped) · synced to ${res.playback.synced_time} ${res.playback.tz_label}`);
      await refreshRuns();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(null), 1200);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      await refreshRuns();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${compact ? '' : 'p-4'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          <Database className="inline w-3.5 h-3.5 mr-1" /> {title}
        </p>
        <a href={sampleCsvUrl()} className="text-[10px] font-mono text-slate-500 hover:text-sky-400" title="Download the generated 24 h sample CSV">
          <Download className="inline w-3 h-3 mr-0.5" /> sample CSV
        </a>
      </div>

      {/* Active dataset banner */}
      <div
        className={`rounded-lg border px-3 py-2 text-xs font-mono ${
          playback?.active ? 'border-sky-800/60 bg-sky-900/10 text-sky-200' : 'border-slate-800 text-slate-500'
        }`}
      >
        {playback?.active ? (
          <>
            <span className="text-sky-400">ACTIVE</span> · {playback.name} · {playback.rows.toLocaleString()} rows @ {playback.step_s}s · row {playback.index + 1} ({playback.row?.timestamp})
            {playback.row && (
              <span className="block text-[10px] text-slate-400 mt-0.5">
                demand {playback.row.demand_mw.toFixed(2)} MW · solar {playback.row.solar_mw.toFixed(2)} MW · ₹{playback.row.micro_price.toFixed(3)} · SoC {playback.row.battery_soc_pct.toFixed(1)}% · {playback.row.grid_frequency_hz.toFixed(3)} Hz
              </span>
            )}
          </>
        ) : (
          <>No dataset active — engine runs the internal diurnal simulator.</>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <button
          type="button"
          disabled={!live || busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-sky-700/40 hover:bg-sky-700/60 disabled:opacity-50 text-sky-100 border border-sky-700/50"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Custom 24H Dataset
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0] ?? null)} />
        <button type="button" disabled={!live || busy} onClick={() => void run(regenerateSample, 'Sample 24 h dataset regenerated and activated')} className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50">
          Regenerate sample
        </button>
        <button type="button" disabled={!live || busy || !playback?.active} onClick={() => void run(deactivatePlayback, 'Playback deactivated — internal simulator running')} className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:text-white disabled:opacity-50">
          Deactivate
        </button>
      </div>

      {progress !== null && (
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-label="Upload progress">
          <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {msg && <p className="text-xs font-mono text-slate-300">{msg}</p>}

      {runs.length > 0 && (
        <div className="text-[11px] font-mono">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Stored runs</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {runs.map((r) => (
              <div key={r.run_id} className="flex items-center gap-2">
                <span className={r.active ? 'text-sky-400' : 'text-slate-600'}>●</span>
                <span className="text-slate-200 truncate flex-1" title={r.run_id}>
                  {r.name}
                </span>
                <span className="text-slate-500">{r.rows.toLocaleString()} rows</span>
                {!r.active && (
                  <button type="button" disabled={busy} onClick={() => void run(() => activateRun(r.run_id), `Activated "${r.name}"`)} className="text-sky-400 hover:text-sky-300">
                    activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] font-mono text-slate-600">
        Schema: timestamp, bus_id, house_count, solar_mw, demand_mw, micro_price, battery_soc_pct, grid_frequency_hz · matched to the wall clock ({playback?.tz_label ?? 'IST'}) at 10 s resolution. Uploading overrides the synthetic CitySimulator instantly.{!isAdmin ? ' Admin role required.' : ''}
      </p>
    </div>
  );
}

export default DatasetUpload;
