"use client";

import { useEngineStore } from "@/store/engineStore";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function TimeSeriesChart() {
  const { time_series } = useEngineStore();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = mounted && theme === 'light';

  const gridColor = isLight ? "rgba(14, 165, 233, 0.1)" : "rgba(255,255,255,0.05)";
  const axisColor = isLight ? "var(--chart-muted)" : "#8b949e";
  const priceStroke = isLight ? "var(--chart-axis)" : "#E0E5EC";
  const socStroke = isLight ? "#8b5cf6" : "#00E5FF";
  const tooltipBg = isLight ? "rgba(255,255,255,0.9)" : "rgba(20,20,30,0.8)";
  const tooltipBorder = isLight ? "rgba(186, 230, 253, 0.5)" : "rgba(255,255,255,0.1)";

  return (
    <div className="flex-1 w-full h-full font-mono text-xs tabular-nums">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={time_series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={priceStroke} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={priceStroke} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={socStroke} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={socStroke} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          <XAxis dataKey="time" stroke={axisColor} tick={{fontSize: 10}} tickFormatter={(v) => v.toString()} axisLine={false} tickLine={false} />
          <YAxis yAxisId="left" stroke={priceStroke} domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke={socStroke} domain={[0, 100]} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
          
          <Tooltip 
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, backdropFilter: 'blur(10px)', borderRadius: '8px' }}
            itemStyle={{ fontFamily: 'var(--font-jetbrains)' }}
          />
          
          <Area yAxisId="left" type="stepAfter" dataKey="price" stroke={priceStroke} fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} isAnimationActive={false} />
          <Area yAxisId="right" type="monotone" dataKey="soc" stroke={socStroke} fillOpacity={1} fill="url(#colorSoc)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
