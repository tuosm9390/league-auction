"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
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

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="group relative w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-secondary/50 hover:bg-secondary transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
      aria-label="테마 변경"
    >
      <div className="relative w-5 h-5 flex items-center justify-center overflow-hidden">
        <Sun className="absolute w-5 h-5 text-minion-yellow transition-all duration-500 rotate-0 scale-100 dark:-rotate-90 dark:scale-0 group-hover:rotate-12" />
        <Moon className="absolute w-5 h-5 text-foreground transition-all duration-500 rotate-90 scale-0 dark:rotate-0 dark:scale-100 group-hover:-rotate-12" />
      </div>

      {/* Tooltip-like background glow */}
      <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300 pointer-events-none" />
    </button>
  );
}
