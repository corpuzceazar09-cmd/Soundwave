import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LightEditorTheme, DarkEditorTheme, EditorThemeColors } from '@/constants/EditorTheme';

type EditorThemeContextType = {
  isDark: boolean;
  colors: EditorThemeColors;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
};

const EditorThemeContext = createContext<EditorThemeContextType | null>(null);

export function EditorThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const isSystemDark = systemScheme === 'dark';
  const [isDark, setIsDark] = useState(false);

  // Sync with system on mount
  useEffect(() => {
    setIsDark(isSystemDark);
  }, [isSystemDark]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => !prev);
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setIsDark(dark);
  }, []);

  const colors = isDark ? DarkEditorTheme : LightEditorTheme;

  return (
    <EditorThemeContext.Provider value={{ isDark, colors, toggleTheme, setDark }}>
      {children}
    </EditorThemeContext.Provider>
  );
}

export function useEditorTheme(): EditorThemeContextType {
  const ctx = useContext(EditorThemeContext);
  if (!ctx) {
    throw new Error('useEditorTheme must be used within EditorThemeProvider');
  }
  return ctx;
}
