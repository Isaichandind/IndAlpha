/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'indalpha-dark': 'rgb(var(--indalpha-dark) / <alpha-value>)',
        'indalpha-card': 'rgb(var(--indalpha-card) / <alpha-value>)',
        'indalpha-green': 'rgb(var(--indalpha-green) / <alpha-value>)',
        'indalpha-red': 'rgb(var(--indalpha-red) / <alpha-value>)',
        'indalpha-text': 'rgb(var(--indalpha-text) / <alpha-value>)',
        'indalpha-muted': 'rgb(var(--indalpha-muted) / <alpha-value>)',
        'indalpha-blue': 'rgb(var(--indalpha-blue) / <alpha-value>)',
        'indalpha-orange': 'rgb(var(--indalpha-orange) / <alpha-value>)',
        'indalpha-purple': 'rgb(var(--indalpha-purple) / <alpha-value>)',
        'indalpha-border': 'rgb(var(--indalpha-border) / <alpha-value>)',
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
