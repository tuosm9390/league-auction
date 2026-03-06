\"use client\";

import React from \"react\";
import { useTheme, Theme } from \"./ThemeContext\";
import { Sun, Moon, Monitor, Palette } from \"lucide-react\";
import { cn } from \"@/lib/utils\";
import { motion } from \"framer-motion\";

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: \"light\", icon: <Sun size={16} />, label: \"미니언즈\" },
    { value: \"dark\", icon: <Moon size={16} />, label: \"야간작전\" },
    { value: \"monotone-light\", icon: <Monitor size={16} />, label: \"모노화이트\" },
    { value: \"monotone-dark\", icon: <Palette size={16} />, label: \"모노블랙\" },
  ];

  return (
    <div className=\"flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-card/80 backdrop-blur-md rounded-2xl border-2 border-border shadow-lg\">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          aria-label={\`\${t.label} 테마로 변경\`}
          className={cn(
            \"relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 font-bold text-xs sm:text-sm\",
            theme === t.value
              ? \"text-minion-blue\"
              : \"text-muted-foreground hover:text-foreground\"
          )}
        >
          {theme === t.value && (
            <motion.div
              layoutId=\"activeTheme\"
              className=\"absolute inset-0 bg-minion-yellow rounded-xl shadow-sm\"
              transition={{ type: \"spring\", bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className={cn(
            \"relative z-10\",
            theme === t.value ? \"animate-pulse\" : \"\"
          )}>
            {t.icon}
          </span>
          <span className=\"relative z-10 whitespace-nowrap\">{t.label}</span>
        </button>
      ))}
    </div>
  );
};
