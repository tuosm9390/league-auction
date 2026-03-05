"use client";

import * as React from "react";
import { Moon, Sun, Award } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl border border-border bg-secondary/50 animate-pulse" />
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("minions");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycleTheme}
      className="group relative w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
      title={
        theme === "light"
          ? "다크 모드로 전환"
          : theme === "dark"
            ? "미니언즈 테마로 전환"
            : "라이트 모드로 전환"
      }
      aria-label="테마 변경"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Light Theme Icon */}
        <Sun
          className={`absolute w-5 h-5 text-amber-500 transition-all duration-500 ${
            theme === "light"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          }`}
        />
        {/* Dark Theme Icon */}
        <Moon
          className={`absolute w-5 h-5 text-blue-400 transition-all duration-500 ${
            theme === "dark"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          }`}
        />
        {/* Minions Theme Icon */}
        <Award
          className={`absolute w-5 h-5 text-minion-yellow transition-all duration-500 ${
            theme === "minions"
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0"
          }`}
        />
      </div>

      {/* Tooltip-like background glow */}
      <div
        className={`absolute inset-0 rounded-xl transition-colors duration-300 pointer-events-none ${
          theme === "minions" ? "bg-minion-yellow/10" : "bg-primary/5"
        } opacity-0 group-hover:opacity-100`}
      />
    </button>
  );
}
