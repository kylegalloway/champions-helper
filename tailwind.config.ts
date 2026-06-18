import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        exact: '#22c55e',
        adjustable: '#f59e0b',
        unowned: '#ef4444',
      },
    },
  },
  plugins: [],
  // pixelated utility for crisp sprite rendering
  safelist: ['pixelated'],
  plugins: [],
} satisfies Config;
