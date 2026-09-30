import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Theme {
  dark: boolean;
  toggle: () => void;
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
}

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setDark(true);
  }, []);

  const toggle = () => {
    setDark(!dark);
    localStorage.setItem('theme', !dark ? 'dark' : 'light');
  };

  const theme: Theme = {
    dark,
    toggle,
    bg: dark ? '#1a1a1a' : '#f5f5f5',
    card: dark ? '#2d2d2d' : '#ffffff',
    text: dark ? '#ffffff' : '#333333',
    textMuted: dark ? '#999999' : '#666666',
    border: dark ? '#444444' : '#dddddd',
    primary: '#1976D2'
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
