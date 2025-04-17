/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- This is ESSENTIAL for our context approach
  content: [
    "./index.html", // Include HTML if applicable
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS/TSX files in src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} 