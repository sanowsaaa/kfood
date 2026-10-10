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
          primary: '#c90073',
          hover: '#ab005d',
          pop: '#ff208a',
          sun: '#ffbf00',
          ink: '#2b0b22',
          muted: '#5b3b50',
          blush: '#fff0f7',
          petal: '#ffe2ef',
          border: '#f3a6cb',
          field: '#8d637a',
          cream: '#fffafc',
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
