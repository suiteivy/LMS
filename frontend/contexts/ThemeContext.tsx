import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode | null>(null);
  const deviceScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  // Load persisted theme once on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        const resolved: ThemeMode =
          saved === 'light' || saved === 'dark' || saved === 'system'
            ? saved
            : 'light';
        setThemeState(resolved);
        setColorScheme(resolved === 'system' ? 'system' : resolved);
      })
      .catch(() => {
        setThemeState('light');
        setColorScheme('light');
      });
  }, []);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setColorScheme(newTheme === 'system' ? 'system' : newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.error('Theme persist fail:', e);
    }
  };

  // Don't render until we've loaded the saved theme
  if (theme === null) return null;

  const isDark = theme === 'system'
    ? deviceScheme === 'dark'
    : theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};