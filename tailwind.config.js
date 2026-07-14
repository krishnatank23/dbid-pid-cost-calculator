/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFCB05',     // Wofi Yellow
        secondary: '#1068B2',   // Wofi Blue
        dark: '#171717',        // Premium Dark Card Fill
        'gray-light': '#ACACAC',
        'gray-text': '#A4A4A4',
        'base-dark': '#000000',
      },
      fontFamily: {
        heading: ['HvDTrial Pluto Sans', 'Outfit', 'sans-serif'],
        body: ['Montserrat', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}
