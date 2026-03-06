"use client";

import { useTheme } from "./ThemeContext";
import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const getThemeName = () => {
    switch (theme) {
      case "minions": return "미니언즈 (기본)";
      case "dark": return "에이즈 다크";
      case "rose": return "우아한 장미";
      default: return theme;
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed bottom-6 right-6 z-50 p-3 bg-card text-foreground rounded-full shadow-lg border border-border hover:scale-110 transition-all group flex items-center gap-2"
      title="테마 변경"
    >
      <Palette className="w-5 h-5 text-primary" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-xs font-bold whitespace-nowrap">
        {getThemeName()}
      </span>
    </button>
  );
}
