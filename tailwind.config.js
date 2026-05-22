/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // GitHub dark palette (Primer Primitives)
        'gh-canvas': '#0d1117',
        'gh-surface': '#161b22',
        'gh-overlay': '#21262d',
        'gh-border': '#30363d',
        'gh-border-muted': '#21262d',
      },
    },
  },
  plugins: [],
};
