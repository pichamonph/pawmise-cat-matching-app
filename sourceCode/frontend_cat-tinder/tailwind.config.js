/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Soft Pink theme - 3 main colors
        'pink-primary': '#E89292',    // Primary Pink
        'pink-light': '#FADEE1',      // Light Pink
        'pink-white': '#FFFFFF',      // White

        // Aliases for compatibility
        primary: '#E89292',
        secondary: '#FADEE1',
        accent: '#E89292',
        background: '#FFFFFF',
        surface: '#FFFFFF',
        border: '#FADEE1',

        // Semantic colors
        error: '#E89292',
        success: '#A8D5BA',
        warning: '#F5C26B',

        // Text colors - using #6B444A
        'text-dark': '#6B444A',       // Main text color
        textPrimary: '#6B444A',
        textSecondary: '#A07D82',
        textTertiary: '#C9B3B6',

        // Dark mode
        darkBg: '#1a1a1a',
        darkSurface: '#2a2a2a',
        darkBorder: '#6B444A',
      },
    },
  },
  plugins: [],
}