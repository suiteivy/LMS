/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./Screens/**/*.{js,jsx,ts,tsx}",
    "./styles/**/*.{js,jsx,ts,tsx}",
    "./navigation/**/*.{js,jsx,ts,tsx}",
    "./contexts/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("./node_modules/nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bgLight: "#F1FFF8",
        bgMain: "#A1EBE5",
        headingColor: "#2C3E50",
        primaryColor: "#128C7E",
        border: "#1ABC9C",
        actionColor: '#1ABC9C',
        teacherOrange: "#FF6B00",
        teacherBlack: "#1a1a1a",
      },
    },
  },
  plugins: [],
};
