"use client";

import { useEffect, useState, useRef } from "react";

interface TickerFlashProps {
  value: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function TickerFlash({ value, decimals = 2, className = "", prefix = "", suffix = "" }: TickerFlashProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value > prevValue.current) {
      setFlash("up");
    } else if (value < prevValue.current) {
      setFlash("down");
    }
    
    prevValue.current = value;
    
    const timer = setTimeout(() => {
      setFlash(null);
    }, 500); // match animation duration
    
    return () => clearTimeout(timer);
  }, [value]);

  let flashClass = "";
  if (flash === "up") flashClass = "animate-flash-green";
  if (flash === "down") flashClass = "animate-flash-red";

  return (
    <span className={`transition-colors duration-200 rounded px-1 -mx-1 ${flashClass} ${className}`}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}
