"use client";

import { useState, useEffect, useRef } from "react";

interface CenterTimerProps {
  timerEndsAt: string;
}

export function CenterTimer({ timerEndsAt }: CenterTimerProps) {
  const [now, setNow] = useState(Date.now());
  const initialDuration = useRef<number | null>(null);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);

  const target = new Date(timerEndsAt).getTime();
  useEffect(() => {
    initialDuration.current = target - Date.now();
  }, [target]);

  const timeLeftMs = Math.max(0, target - now);
  const timeLeftSec = Math.max(0, (timeLeftMs - 100) / 1000);
  const displayTime = Math.ceil(timeLeftSec);
  const progress = initialDuration.current
    ? (timeLeftMs / initialDuration.current) * 100
    : 0;
  const isUrgent = displayTime > 0 && displayTime <= 5;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div
        className={`pixel-box px-6 py-2 flex items-center gap-3 ${isUrgent ? "bg-white !border-red-600 text-red-600 animate-shake" : "bg-black border-black text-minion-yellow"}`}
      >
        <span className="text-xl">⏳</span>
        <span className="text-3xl lg:text-4xl font-black tracking-widest">
          {isUrgent
            ? timeLeftSec.toFixed(1)
            : `${pad(Math.floor(displayTime / 60))}:${pad(displayTime % 60)}`}
        </span>
      </div>
      <div className="w-48 h-4 bg-gray-800 border-2 border-black overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${isUrgent ? "bg-red-500" : "bg-minion-yellow"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
