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
        brand: {
          primary: '#703b62',
          hover: '#552749',
          ink: '#312332',
          muted: '#695969',
          blush: '#fff4f8',
          petal: '#f7dce8',
          border: '#e9ccd9',
          cream: '#fffaf4',
          sage: '#30675d',
        },
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
