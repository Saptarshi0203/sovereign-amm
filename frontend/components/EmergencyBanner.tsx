"use client";

import { useEffect, useState } from "react";

export default function EmergencyBanner() {
  const [emergency, setEmergency] = useState({ active: false, reason: "", operator: "" });

  useEffect(() => {
    // We connect to the global WebSocket to listen for emergency state
    // In a real app we might use Zustand or Context for the WS, 
    // but here we just open a connection and listen for the specific fields.
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/stream");

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state" && data.emergency) {
          setEmergency(data.emergency);
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  if (!emergency.active) return null;

  return (
    <div className="w-full bg-red-600 text-white px-4 py-2 text-center font-bold text-sm tracking-wide z-50 animate-pulse">
      🚨 EMERGENCY OVERRIDE ACTIVE 🚨
      <span className="font-normal ml-2">
        Engaged by: {emergency.operator} | Reason: {emergency.reason}
      </span>
    </div>
  );
}
