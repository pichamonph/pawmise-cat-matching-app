import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorScheme = 'light' | 'dark';

// Color palette - Soft Pink Theme
const ColorPalette = {
  light: {
    // Primary Colors
    primary: '#E89292',        // Primary Pink
    secondary: '#FADEE1',      // Light Pink
    accent: '#E89292',         // Primary Pink
    background: '#FFFFFF',     // White Background
    surface: '#FFFFFF',        // White Surface
    border: '#FADEE1',         // Light Pink Border

    // Semantic Colors
    error: '#E89292',          // Error (use primary pink)
    success: '#A8D5BA',        // Success Green (soft)
    warning: '#F5C26B',        // Warning Yellow (soft)

    // Text Colors
    text: '#6B444A',           // Dark text
    textSecondary: '#A07D82',  // Medium text (lighter than primary)
    textTertiary: '#C9B3B6',   // Light text
    textInverse: '#FFFFFF',    // White text

    // Additional
    overlay: 'rgba(107, 68, 74, 0.5)',
    shadow: 'rgba(232, 146, 146, 0.2)',
  },
  dark: {
    // Primary Colors
    primary: '#E89292',        // Primary Pink (same)
    secondary: '#FADEE1',      // Light Pink
    accent: '#E89292',         // Primary Pink
    background: '#1a1a1a',     // Dark Background
    surface: '#2a2a2a',        // Dark Surface
    border: '#6B444A',         // Dark border

    // Semantic Colors
    error: '#E89292',          // Error
    success: '#A8D5BA',        // Success Green
    warning: '#F5C26B',        // Warning Yellow

    // Text Colors
    text: '#FFFFFF',           // White
    textSecondary: '#FADEE1',  // Light Pink
    textTertiary: '#E89292',   // Primary Pink
    textInverse: '#6B444A',    // Dark text

    // Additional
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

interface ThemeContextType {
  colorScheme: ColorScheme;
  colors: typeof ColorPalette.light;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@pawmise_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  // โหลด theme จาก AsyncStorage
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setColorScheme(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newScheme: ColorScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newScheme);

    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newScheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = colorScheme === 'dark' ? ColorPalette.dark : ColorPalette.light;
  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ colorScheme, colors, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
