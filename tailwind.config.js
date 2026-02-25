/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00ffff',
        'neon-pink': '#ff00ff',
        'neon-red': '#ff0040',
        'dark-bg': '#0a0a0f',
        'dark-panel': '#111118',
        'dark-border': '#222233',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'flicker': 'flicker 0.15s infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { textShadow: '0 0 5px #00ffff, 0 0 10px #00ffff' },
          '50%': { textShadow: '0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff' },
        },
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
