/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- This is ESSENTIAL for our context approach
  content: [
    "./index.html", // Include HTML if applicable
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS/TSX files in src
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      animation: {
        'wave': 'wave 15s ease-in-out infinite',
        'wave-reverse': 'wave-reverse 18s ease-in-out infinite',
        'float': 'float 20s linear infinite',
        'pulse-slow': 'pulse-slow 8s ease-in-out infinite',
      },
      keyframes: {
        wave: {
          '0%': { transform: 'translate(-20%, 30%) rotate(0deg)' },
          '50%': { transform: 'translate(-22%, 32%) rotate(2deg)' },
          '100%': { transform: 'translate(-20%, 30%) rotate(0deg)' },
        },
        'wave-reverse': {
          '0%': { transform: 'translate(25%, 40%) rotate(0deg)' },
          '50%': { transform: 'translate(23%, 42%) rotate(-2deg)' },
          '100%': { transform: 'translate(25%, 40%) rotate(0deg)' },
        },
        float: {
          '0%': { 
            transform: 'translateY(0)',
            opacity: '0'
          },
          '10%': { 
            opacity: '0.8'
          },
          '100%': { 
            transform: 'translateY(-100vh)',
            opacity: '0'
          },
        },
        'pulse-slow': {
          '0%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '0.8' 
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
        },
      },
    },
  },
  plugins: [],
} 