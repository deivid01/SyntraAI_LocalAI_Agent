/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/ui/**/*.{html,ts}", "./src/ui/*.html"],
  theme: {
    extend: {
      colors: {
        'syntra-bg': '#09090b', // Zinc-950 equivalent
        'syntra-secondary': '#18181b', // Zinc-900 equivalent
        'syntra-primary': {
          DEFAULT: '#8b5cf6', // Violet-500
          hover: '#7c3aed', // Violet-600
        },
        'syntra-accent': '#06b6d4', // Cyan-500
      },
      backgroundImage: {
        'syntra-gradient': 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
        'syntra-glass': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.8', filter: 'brightness(1.5)' },
        }
      }
    },
  },
  plugins: [],
}
