import { create } from 'zustand';
import { ColorThemeMode } from '../design-system/theme';
import { SupportedLanguage } from '../core/localization';

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

export const useAppStore = create<AppState>((set, get) => ({
  themeMode: 'system',
  language: 'en',
  recentSearches: [
    { fromCityId: 101, fromCityName: 'Mumbai', toCityId: 102, toCityName: 'Pune' },
    { fromCityId: 201, fromCityName: 'Bangalore', toCityId: 202, toCityName: 'Chennai' },
    { fromCityId: 301, fromCityName: 'Delhi', toCityId: 302, toCityName: 'Jaipur' },
  ],

  setThemeMode: (mode) => set({ themeMode: mode }),
  setLanguage: (lang) => set({ language: lang }),

  addRecentSearch: (route) => {
    const { recentSearches } = get();
    const filtered = recentSearches.filter(
      (r) => !(r.fromCityId === route.fromCityId && r.toCityId === route.toCityId)
    );
    set({ recentSearches: [route, ...filtered].slice(0, 5) });
  },
}));
