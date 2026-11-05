import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage, persist } from 'zustand/middleware';
import { create } from 'zustand';
import type { ColorThemeMode } from '../design-system/theme';
import type { SupportedLanguage } from '../core/localization';

export interface RouteSearchItem {
  fromCityId: number;
  fromCityName: string;
  toCityId: number;
  toCityName: string;
}

interface AppState {
  themeMode: ColorThemeMode;
  language: SupportedLanguage;
  recentSearches: RouteSearchItem[];
  setThemeMode: (mode: ColorThemeMode) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  addRecentSearch: (route: RouteSearchItem) => void;
}

export const useAppStore = create<AppState>()(persist((set, get) => ({
  themeMode: 'system',
  language: 'en',
  recentSearches: [],
  setThemeMode: (mode) => set({ themeMode: mode }),
  setLanguage: (lang) => set({ language: lang }),

  addRecentSearch: (route) => {
    const { recentSearches } = get();
    const filtered = recentSearches.filter(
      (r) => !(r.fromCityId === route.fromCityId && r.toCityId === route.toCityId)
    );
    set({ recentSearches: [route, ...filtered].slice(0, 5) });
  },
 }), {
  name: 'aibus_preferences',
  storage: createJSONStorage(() => ({
    getItem: (key) => Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key),
    setItem: (key, value) => Platform.OS === 'web' ? localStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
    removeItem: (key) => Platform.OS === 'web' ? localStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
  })),
  partialize: ({ themeMode, language }) => ({ themeMode, language }),
}));
