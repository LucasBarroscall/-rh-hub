/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
      },
      colors: {
        ink: '#141A2E',
        // Paleta da marca:
        // Principal #2f4c73 · Secundária #D4D943 · #30cff2 · #2a438c · #a64170
        // Escala completa (50→950) para não faltar nenhum tom usado no app.
        navy: {
          50: '#F1F4F9',
          100: '#DFE6F1',
          200: '#C3D0E4',
          300: '#A3B6D6',
          400: '#6E85AC',
          500: '#51698F',
          600: '#3C577C',
          700: '#2f4c73', // principal
          800: '#2a438c',
          900: '#1B2A45',
          950: '#0F1729',
        },
        amber: {
          400: '#D4D943', // secundária
          500: '#C3C82F',
          600: '#9CA023',
          700: '#767A19',
        },
        cyan: {
          400: '#30cff2',
          500: '#1AB6D8',
          600: '#1394B0',
        },
        sage: {
          500: '#8B9A1F',
          600: '#707D19',
        },
        clay: {
          500: '#a64170',
          600: '#8a3560',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 21, 38, 0.06), 0 4px 16px rgba(15, 21, 38, 0.06)',
      },
    },
  },
  plugins: [],
}
