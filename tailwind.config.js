/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: '#1C1E21',
        secondary: '#4A3B32',
        accent: '#C6939A',
        'accent-light': '#D4A9AF',
        'accent-dark': '#A87880',
        cream: '#EBE7DF',
        'cream-dark': '#D9D3C9',
        'cream-light': '#F5F2ED',
      },
    },
  },
  plugins: [],
}
