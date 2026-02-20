/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./source_index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bsky-blue': '#228DFF',
        'bsky-blue-hover': '#1A6FCC',
        'bsky-blue-light': '#AFD4FF',
        'bsky-dark': '#0F1419',
        'bsky-dark-surface': '#16202A',
        'bsky-dark-elevated': '#1E2732',
        'bsky-dark-border': '#2D3A45',
        'bsky-text-secondary': '#8B98A5',
        'bsky-text-tertiary': '#5B6B7A',
      },
    },
  },
  plugins: [],
}
