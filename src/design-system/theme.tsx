import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, ThemeColors } from './tokens/colors';
import { Typography } from './tokens/typography';
import { Spacing } from './tokens/spacing';
import { Radii } from './tokens/radii';
import { Shadows } from './tokens/shadows';

export type ColorThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  typography: typeof Typography;
  spacing: typeof Spacing;
  radii: typeof Radii;
  shadows: typeof Shadows;
}

const ThemeContext = createContext<Theme>({
  isDark: false,
  colors: LightColors,
  typography: Typography,
  spacing: Spacing,
  radii: Radii,
  shadows: Shadows,
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  themeMode?: ColorThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, themeMode = 'system' }) => {
  const systemColorScheme = useColorScheme();

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themeMode, systemColorScheme]);

  const value = useMemo<Theme>(() => {
    return {
      isDark,
      colors: isDark ? DarkColors : LightColors,
      typography: Typography,
      spacing: Spacing,
      radii: Radii,
      shadows: Shadows,
    };
  }, [isDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = (): Theme => {
  return useContext(ThemeContext);
};
