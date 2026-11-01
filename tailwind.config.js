// Design system: warm, human and calm.
// brand = deep masjid green, gold = saffron, clay = terracotta, sand = warm paper background.
export default {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eef7f2', 100: '#d5ecdf', 200: '#a9d7bf', 300: '#74bb98', 400: '#449c74', 500: '#24805a', 600: '#17694a', 700: '#11553d', 800: '#0d4332', 900: '#0a3327', 950: '#061f18' },
        gold: { 50: '#fdf7ea', 100: '#faeccb', 200: '#f4d896', 300: '#edc05d', 400: '#e6a93a', 500: '#d18c22', 600: '#ad6c19' },
        clay: { 50: '#fcf1ec', 100: '#f8ddd1', 400: '#df8462', 500: '#cc6440', 600: '#ad4d2d' },
        sand: { 50: '#fdfbf7', 100: '#faf6ee', 200: '#f3ecdf', 300: '#e8dccb', 400: '#d4c3aa' },
        ink: { 400: '#7b8580', 500: '#5c6762', 600: '#45504b', 700: '#323b37', 800: '#222a26', 900: '#151b18' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(34,42,38,.04), 0 4px 16px -4px rgba(34,42,38,.08)',
        lift: '0 2px 4px rgba(34,42,38,.05), 0 16px 40px -12px rgba(34,42,38,.18)',
        glow: '0 0 0 1px rgba(36,128,90,.12), 0 8px 30px -6px rgba(36,128,90,.35)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        'float': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(20px,-14px) scale(1.06)' } },
        'shimmer': { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.2,.7,.2,1) both',
        'float': 'float 14s ease-in-out infinite',
        'shimmer': 'shimmer 6s linear infinite',
      },
    },
  },
  plugins: [],
};
