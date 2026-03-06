\"use client\";

import React, { createContext, useContext, useEffect, useState } from \"react\";

export type Theme = \"light\" | \"dark\" | \"monotone-light\" | \"monotone-dark\";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LS_THEME_KEY = \"minions-auction-theme\";

// Sanitization function for theme value
const sanitizeTheme = (value: string | null): Theme => {
  const validThemes: Theme[] = [\"light\", \"dark\", \"monotone-light\", \"monotone-dark\"];
  if (value && validThemes.includes(value as Theme)) {
    return value as Theme;
  }
  return \"light\"; // Default theme
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(\"light\");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // On mount, get theme from localStorage
    const savedTheme = localStorage.getItem(LS_THEME_KEY);
    const initialTheme = sanitizeTheme(savedTheme);
    setThemeState(initialTheme);
    
    // Apply theme to document
    const root = window.document.documentElement;
    root.classList.remove(\"light\", \"dark\", \"monotone-light\", \"monotone-dark\");
    if (initialTheme !== \"light\") {
      root.classList.add(initialTheme);
    }
    root.style.colorScheme = initialTheme.includes(\"dark\") ? \"dark\" : \"light\";
    
    setIsMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(LS_THEME_KEY, newTheme);
    
    const root = window.document.documentElement;
    root.classList.remove(\"light\", \"dark\", \"monotone-light\", \"monotone-dark\");
    if (newTheme !== \"light\") {
      root.classList.add(newTheme);
    }
    root.style.colorScheme = newTheme.includes(\"dark\") ? \"dark\" : \"light\";
  };

  const toggleTheme = () => {
    const themes: Theme[] = [\"light\", \"dark\", \"monotone-light\", \"monotone-dark\"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Prevent hydration flicker by only rendering children after mount
  if (!isMounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(\"useTheme must be used within a ThemeProvider\");
  }
  return context;
};
