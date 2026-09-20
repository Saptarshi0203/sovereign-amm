export default function Loading() {
  return (
    <div className="w-full h-[80vh] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-800/50 p-8">
      <div className="flex flex-col items-center space-y-6 animate-pulse">
        {/* Glowing ring loader */}
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500/50 animate-spin" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-2 rounded-full border-r-2 border-indigo-500/50 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
          <div className="absolute inset-4 rounded-full border-b-2 border-rose-500/50 animate-spin" style={{ animationDuration: '1.5s' }}></div>
          {/* Inner core */}
          <div className="absolute inset-8 bg-emerald-500/20 rounded-full blur-md"></div>
        </div>
        
        {/* Status text */}
        <div className="text-center">
          <p className="text-emerald-400 text-sm tracking-widest" style={{ fontFamily: 'var(--font-display), "Aldrich", sans-serif' }}>
            [ SYSTEM WAKING UP: ESTABLISHING SECURE CONNECTION... ]
          </p>
          <div className="w-64 h-1 bg-slate-800 rounded-full mt-4 overflow-hidden mx-auto">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-rose-500 w-1/2 animate-slide-in-right opacity-70"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
