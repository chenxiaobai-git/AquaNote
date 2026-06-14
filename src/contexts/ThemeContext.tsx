import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ThemeName = 'deep-ocean' | 'light' | 'coral' | 'midnight';

const STORAGE_KEY = 'aquanote_theme';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'deep-ocean',
  setTheme: () => {},
});

function loadSavedTheme(): ThemeName {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && ['deep-ocean', 'light', 'coral', 'midnight'].includes(raw)) {
      return raw as ThemeName;
    }
  } catch { /* noop */ }
  return 'deep-ocean';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(loadSavedTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme === 'deep-ocean' ? '' : theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
