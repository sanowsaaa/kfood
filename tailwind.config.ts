/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        korean: {
          red: '#dc2626',
          'red-dark': '#b91c1c',
          'red-light': '#fef2f2',
          gold: '#f59e0b',
          warm: '#fefaf5',
        },
      },
    },
  },
  plugins: [],
}