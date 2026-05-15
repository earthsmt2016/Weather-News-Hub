import { useState, useEffect, createContext, useContext } from "react";
import { THEME_LIGHT, THEME_DARK, THEME_STORAGE_KEY, THEME_DOM_CLASS } from "@/lib/constants";

type Theme = typeof THEME_LIGHT | typeof THEME_DARK;

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: THEME_LIGHT,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || THEME_LIGHT;
    }
    return THEME_LIGHT;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === THEME_DARK) {
      root.classList.add(THEME_DOM_CLASS);
    } else {
      root.classList.remove(THEME_DOM_CLASS);
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === THEME_LIGHT ? THEME_DARK : THEME_LIGHT));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
