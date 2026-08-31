/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
      },
      colors: {
        ink: '#141A2E',
        slate: {
          950: '#0F1526',
        },
        navy: {
          50: '#EEF1F8',
          100: '#D8DFF0',
          200: '#B3BFE0',
          400: '#5A6FA8',
          600: '#2C3E70',
          700: '#212F57',
          800: '#182448',
          900: '#101733',
        },
        amber: {
          400: '#E8A33D',
          500: '#DB9224',
          600: '#B8791B',
        },
        sage: {
          500: '#5C8A6E',
          600: '#446A53',
        },
        clay: {
          500: '#C1594B',
          600: '#A5433A',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 21, 38, 0.06), 0 4px 16px rgba(15, 21, 38, 0.06)',
      },
    },
  },
  plugins: [],
}
