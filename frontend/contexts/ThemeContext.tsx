import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => Promise<void>;
  isDark: boolean;
  themeProgress: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@app_theme_mode';

// ── Native Theme Transition Overlay (Mobile) ──────────────────────────────
interface OverlayState {
  active: boolean;
  prevIsDark: boolean;
}

const NativeThemeTransitionOverlay: React.FC<{
  isDark: boolean;
  reduceMotion: boolean;
}> = ({ isDark, reduceMotion }) => {
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isFirstRender = useRef(true);
  const prevIsDarkRef = useRef(isDark);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevIsDarkRef.current = isDark;
      return;
    }

    if (prevIsDarkRef.current !== isDark) {
      const prevWasDark = prevIsDarkRef.current;
      prevIsDarkRef.current = isDark;

      if (reduceMotion) {
        // Reduced motion: instant snap without visual crossfade
        return;
      }

      setOverlay({ active: true, prevIsDark: prevWasDark });
      opacityAnim.setValue(1);

      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setOverlay(null);
      });
    }
  }, [isDark, reduceMotion, opacityAnim]);

  if (!overlay || !overlay.active) return null;

  const overlayBg = overlay.prevIsDark ? '#0F0B2E' : '#F6F8FA';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: overlayBg,
          opacity: opacityAnim,
          zIndex: 99998,
        },
      ]}
    />
  );
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          return saved as ThemeMode;
        }
      } catch {}
    }
    return 'dark'; // Dark-first design default
  });
  const deviceScheme = useColorScheme();
  const { colorScheme, setColorScheme } = useNativeWindColorScheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  const resolveAppliedScheme = (mode: ThemeMode) => {
    if (mode === 'dark' || mode === 'light') return mode;
    return deviceScheme === 'dark' ? 'dark' : 'light';
  };

  const isDark = theme === 'system'
    ? deviceScheme === 'dark'
    : theme === 'dark';

  // Animated progress value (0 = light, 1 = dark)
  const themeProgress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Accessibility: detect reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      subscription?.remove();
    };
  }, []);

  // Animate themeProgress whenever isDark transitions
  useEffect(() => {
    const targetValue = isDark ? 1 : 0;
    if (reduceMotion) {
      themeProgress.setValue(targetValue);
      return;
    }

    Animated.timing(themeProgress, {
      toValue: targetValue,
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [isDark, reduceMotion, themeProgress]);

  // Load persisted theme once on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(saved => {
        const resolved: ThemeMode =
          saved === 'light' || saved === 'dark' || saved === 'system'
            ? saved
            : 'dark';
        setThemeState(resolved);
        setColorScheme(resolveAppliedScheme(resolved));
      })
      .catch(() => {
        setThemeState('dark');
        setColorScheme(resolveAppliedScheme('dark'));
      });
  }, [setColorScheme, deviceScheme]);

  useEffect(() => {
    if (colorScheme !== 'light' && colorScheme !== 'dark') return;
    setThemeState(colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    setColorScheme(resolveAppliedScheme('system'));
  }, [theme, deviceScheme, setColorScheme]);

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setColorScheme(resolveAppliedScheme(newTheme));
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      }
    } catch (e) {
      console.error('Theme persist fail:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, themeProgress }}>
      <View style={{ flex: 1 }}>
        {children}
        {Platform.OS !== 'web' && (
          <NativeThemeTransitionOverlay isDark={isDark} reduceMotion={reduceMotion} />
        )}
      </View>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

