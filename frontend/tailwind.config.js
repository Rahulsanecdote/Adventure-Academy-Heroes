/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Roblox-inspired color palette
        roblox: {
          blue: '#00A2FF',
          darkblue: '#0074E4',
          green: '#00C800',
          red: '#FF4545',
          yellow: '#FFC700',
          orange: '#FF8C00',
          purple: '#A335EE',
        },
        primary: {
          50: '#E6F7FF',
          100: '#B3E5FF',
          200: '#80D4FF',
          300: '#4DC2FF',
          400: '#1AB1FF',
          500: '#00A2FF', // Roblox blue
          600: '#0088D9',
          700: '#006EB3',
          800: '#00548C',
          900: '#003A66',
        },
        secondary: {
          50: '#E6FFF0',
          100: '#B3FFD9',
          200: '#80FFC2',
          300: '#4DFFAA',
          400: '#1AFF93',
          500: '#00E676', // Bright green
          600: '#00C863',
          700: '#00AA50',
          800: '#008C3D',
          900: '#006E2A',
        },
        game: {
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
          xp: '#9D4EDD',
          coin: '#FFC107',
        },
        success: '#00C800',
        warning: '#FFC700',
        error: '#FF4545',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Fredoka', 'Poppins', 'system-ui', 'sans-serif'],
        game: ['Luckiest Guy', 'Fredoka', 'system-ui', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'pop': 'pop 0.3s ease-out',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 162, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 162, 255, 0.8)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'game': '0 6px 0 rgba(0, 0, 0, 0.2)',
        'game-hover': '0 4px 0 rgba(0, 0, 0, 0.2)',
        'game-active': '0 2px 0 rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(0, 162, 255, 0.5)',
        'glow-green': '0 0 20px rgba(0, 200, 0, 0.5)',
        'glow-yellow': '0 0 20px rgba(255, 199, 0, 0.5)',
      },
    },
  },
  plugins: [],
}