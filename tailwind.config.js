/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#05060E',
          900: '#05060E',
          800: '#080A16',
          700: '#0B0D1C',
          600: '#10132A',
          500: '#171B38',
        },
        // Azul profundo da marca (deep electric)
        royal: {
          DEFAULT: '#2E4BFF',
          600: '#1F39F0',
          400: '#5A6DFF',
          300: '#8A97FF',
          200: '#BAC2FF',
        },
        // Ciano elétrico — acento principal (Persona)
        sky: {
          DEFAULT: '#29CEF9',
          600: '#12AEE0',
          400: '#5CDBFF',
          300: '#93E7FF',
          200: '#C3F1FF',
        },
        // Vermelho sinal (derrotas) — cortante, não pastel
        loss: {
          DEFAULT: '#FF2E4D',
          600: '#F00F32',
          400: '#FF6379',
          300: '#FF97A6',
          200: '#FFC7CE',
        },
        // Verde ácido (vitórias)
        win: {
          DEFAULT: '#1FE39A',
          400: '#5CEDB6',
          300: '#93F3CE',
        },
        cloud: '#EAF1FF',
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'Haettenschweiler', 'sans-serif'],
        condensed: ['Oswald', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow:         '0 0 0 1px rgba(41,206,249,0.30), 0 18px 40px -18px rgba(41,206,249,0.45)',
        'glow-royal': '0 14px 40px -16px rgba(46,75,255,0.60)',
        'glow-loss':  '0 14px 40px -16px rgba(255,46,77,0.50)',
        'glow-sm':    '0 0 0 1px rgba(41,206,249,0.22), 0 8px 22px -12px rgba(41,206,249,0.40)',
        'inner-sky':  'inset 0 1px 0 rgba(41,206,249,0.14)',
      },
      backgroundImage: {
        'royal-grad': 'linear-gradient(120deg, #2E4BFF 0%, #29CEF9 100%)',
        'next-grad':  'linear-gradient(120deg, #2E4BFF 0%, #131A44 70%, #080A16 100%)',
        'hero-dark':  'linear-gradient(120deg, rgba(46,75,255,0.20) 0%, rgba(41,206,249,0.06) 40%, transparent 68%)',
        'hero-light': 'linear-gradient(120deg, rgba(46,75,255,0.14) 0%, rgba(41,206,249,0.05) 40%, transparent 68%)',
        'stat-blue':  'linear-gradient(135deg, rgba(41,206,249,0.14) 0%, transparent 65%)',
        'stat-red':   'linear-gradient(135deg, rgba(255,46,77,0.14) 0%, transparent 65%)',
        'stat-green': 'linear-gradient(135deg, rgba(31,227,154,0.14) 0%, transparent 65%)',
        'stat-gold':  'linear-gradient(135deg, rgba(255,190,0,0.16) 0%, transparent 65%)',
      },
      keyframes: {
        'fade-in':  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'pop-in':   { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'slide-in': { '0%': { opacity: 0, transform: 'translateX(-14px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        'shimmer':  { '0%': { 'background-position': '200% center' }, '100%': { 'background-position': '-200% center' } },
        'tier-pulse': { '0%, 100%': { transform: 'scale(1.16)' }, '50%': { transform: 'scale(1.28)' } },
      },
      animation: {
        'fade-in':    'fade-in 0.15s ease-out',
        'pop-in':     'pop-in 0.16s cubic-bezier(0.22,1,0.36,1)',
        'slide-up':   'slide-up 0.22s cubic-bezier(0.22,1,0.36,1)',
        'slide-in':   'slide-in 0.25s cubic-bezier(0.22,1,0.36,1)',
        'shimmer':    'shimmer 2.5s linear infinite',
        'tier-pulse': 'tier-pulse 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
