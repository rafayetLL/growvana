/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        ink: {
          900: '#0f172a',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        moss: {
          50: '#F6F8F4',
          100: '#EEF3EC',
          200: '#DCE8DD',
          300: '#BBD4C2',
          400: '#8DBB9D',
          500: '#5A9A77',
          600: '#3F7558',
          700: '#2C5640',
        },
        clay: {
          100: '#FBE8DC',
          300: '#F2BFA0',
          500: '#DC8A60',
          600: '#C26B43',
          700: '#9B4A2B',
        },
        cream: {
          100: '#FAF6EE',
          200: '#F2ECDF',
          300: '#E8DFCB',
        },
        parchment: '#F4F2EC',
        forest: {
          900: '#0F1A14',
          800: '#18261D',
          700: '#25372C',
          600: '#3A4F40',
        },
        botanical: {
          line: '#E4E5DF',
          soft: '#EFEFE9',
          text2: '#4A5751',
          text3: '#7B867F',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Manrope', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)',
        botanical: '0 6px 18px rgba(15,26,20,.07), 0 2px 4px rgba(15,26,20,.04)',
      },
    },
  },
  plugins: [],
};
