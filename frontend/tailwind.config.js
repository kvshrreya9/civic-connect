/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2fb', 100: '#d9e1f5', 200: '#b3c3eb', 300: '#7f97d6', 400: '#4a68b8',
          500: '#2b4a99', 600: '#1e3778', 700: '#16295c', 800: '#0f1d44', 900: '#0a1433', 950: '#060c22',
        },
        electric: {
          50: '#eef5ff', 100: '#d9e8ff', 200: '#bcd6ff', 300: '#8ebcff', 400: '#5996ff',
          500: '#2f6bff', 600: '#1a4ff5', 700: '#143de1', 800: '#1733b6', 900: '#19318f',
        },
        signal: { 400: '#ffc94d', 500: '#ffb020' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Manrope', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 1px 2px rgba(10,20,51,.06), 0 8px 24px -12px rgba(10,20,51,.18)',
        glow: '0 0 0 1px rgba(47,107,255,.25), 0 12px 32px -12px rgba(47,107,255,.55)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        ping2: { '0%': { transform: 'scale(.6)', opacity: .8 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        dash: { to: { strokeDashoffset: 0 } },
      },
      animation: {
        rise: 'rise .6s cubic-bezier(.2,.7,.2,1) both',
        ping2: 'ping2 2.4s cubic-bezier(0,0,.2,1) infinite',
        shimmer: 'shimmer 1.4s infinite',
        dash: 'dash 1.6s ease-out forwards',
      },
    },
  },
  plugins: [],
}
