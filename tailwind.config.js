/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#04070f',
          900: '#070c18',
          800: '#0a1428',
          700: '#0f1d38',
          600: '#16294d',
        },
        glow: {
          cyan: '#38e1ff',
          teal: '#2dd4bf',
          blue: '#4d8dff',
          amber: '#ffb347',
          magenta: '#ff5ea8',
          green: '#5eead4',
          red: '#ff6b6b',
        },
        ink: {
          DEFAULT: '#e8f4ff',
          dim: '#9fb6d4',
          faint: '#5f7799',
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(56,225,255,0.25)',
        'glow-sm': '0 0 12px rgba(56,225,255,0.2)',
        panel: '0 8px 40px rgba(0,0,0,0.55)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'pulse-slow': 'pulse 3.5s ease-in-out infinite',
        'fade-in': 'fadeIn .5s ease both',
        'slide-up': 'slideUp .5s cubic-bezier(.2,.8,.2,1) both',
        'slide-left': 'slideLeft .45s cubic-bezier(.2,.8,.2,1) both',
        'slide-right': 'slideRight .45s cubic-bezier(.2,.8,.2,1) both',
        scan: 'scan 4s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideLeft: { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        slideRight: { from: { opacity: '0', transform: 'translateX(-24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
    },
  },
  plugins: [],
};