/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'indalpha-dark': '#0f1115',
        'indalpha-card': '#1a1d24',
        'indalpha-green': '#10b981',
        'indalpha-red': '#ef4444',
        'indalpha-text': '#e2e8f0',
        'indalpha-muted': '#94a3b8',
        'indalpha-blue': '#3b82f6',
        'indalpha-orange': '#f59e0b',
        'indalpha-purple': '#8b5cf6',
      },
      animation: {
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-out-right': 'slideOutRight 0.2s ease-in',
        'fade-in': 'fadeIn 0.15s ease-out',
        'pulse-green': 'pulseGreen 1.5s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      },
    },
  },
  plugins: [],
}
