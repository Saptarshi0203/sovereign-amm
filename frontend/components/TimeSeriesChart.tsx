"use client";

import { useEngineStore } from "@/store/engineStore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TimeSeriesChart() {
  const { time_series } = useEngineStore();

  return (
    <div className="flex-1 w-full h-full font-mono text-xs tabular-nums">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={time_series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c9d1d9" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#c9d1d9" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="time" stroke="#8b949e" tick={{fontSize: 10}} tickFormatter={(v) => v.toString()} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" stroke="#c9d1d9" domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#00E5FF" domain={[0, 100]} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
          
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(20,20,30,0.8)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '8px' }}
            itemStyle={{ fontFamily: 'var(--font-jetbrains)' }}
          />
          
          <Area yAxisId="left" type="stepAfter" dataKey="price" stroke="#E0E5EC" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} isAnimationActive={false} />
          <Area yAxisId="right" type="monotone" dataKey="soc" stroke="#00E5FF" fillOpacity={1} fill="url(#colorSoc)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
