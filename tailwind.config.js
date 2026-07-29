/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // `brand` is Tailwind's EMERALD ramp, value for value — so 300 and 400,
        // which were referenced but never defined, are emerald's own. 300 is a
        // border tint on white; 400 is light text on dark (`dark:text-brand-400`).
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // `ink` is Tailwind's SLATE ramp, value for value — same story: 600 and
        // 800 were referenced and undefined, and slate supplies both. 600 carries
        // body text on white (7.5:1); 800 is a hover/emphasis step above it.
        ink: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
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
        // Meta Ad Agent design system (light shell + navy/Meta-blue accents).
        // Shared with the PDP Agent screen.
        //
        // 500 and 300 were used from the day this ramp landed but never defined,
        // so `text-navy-500` and `text-navy-300` emitted no rule at all and those
        // elements silently inherited their parent's colour. Both are filled in
        // below against the background each is actually used on:
        //   navy-500 — secondary text on white / navy-50 backgrounds, down to
        //     10.5px. 4.98:1 on white, so it clears AA for small text while still
        //     reading as muted beside navy-900.
        //   navy-300 — text on the NAVY-900 TOPBAR (the header hint, the stepper's
        //     unreached labels), so it has to be light, not a mid-tone. 8.3:1 on
        //     navy-900. It doubles as a hover border on white, which needs no
        //     contrast of its own.
        navy: {
          900: '#0D1B4B',
          800: '#1A2A5F',
          700: '#243463',
          600: '#4A5DA8',
          500: '#5C6CAF',
          400: '#8A9CC0',
          300: '#A9B9D8',
          200: '#C7D6F0',
          100: '#E2E8F5',
          50: '#F1F5FB',
        },
        // Same gap here: 300 and 200 were referenced and undefined.
        //   meta-300 — light text on dark surfaces only (`dark:text-meta-300`).
        //   meta-200 — a border tint on white; decorative, no contrast floor.
        meta: {
          700: '#0550C8',
          600: '#0866FF',
          500: '#3B82F6',
          300: '#90B8FB',
          200: '#BBD3FD',
          100: '#E5EEFF',
          50: '#F2F6FF',
        },
        // Bespoke, and deliberately NOT a linear ramp. 400/500 are neon accents
        // built for navy backgrounds (`bg-mint-500 text-navy-900`); 600 is the
        // opposite job — `text-mint-600` on WHITE at 10px, where mint-500 would
        // sit at 1.5:1 and be unreadable. Hence the large jump: same hue (160°),
        // dark enough to clear AA (5.4:1). It lands near `positive` (#067a4a) by
        // arriving at the same problem from the mint side.
        mint: {
          600: '#007A52',
          500: '#00F0A0',
          400: '#34F5B0',
          100: '#D6FBEE',
        },
        gold: '#B8860A',
        danger: '#FF4D4F',
        positive: '#067a4a',
        canvas: '#F2F4F8',
        mist: '#F9FBFF',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Manrope', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)',
        botanical: '0 6px 18px rgba(15,26,20,.07), 0 2px 4px rgba(15,26,20,.04)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
