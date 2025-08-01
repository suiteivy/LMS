/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bgLight: "#F1FFF8",
        bgMain: "#A1EBE5",
        headingColor: "#2C3E50",
        primaryColor: "#128C7E",
        border: "#1ABC9C",
        actionColor:'#1ABC9C',
      },
    },
  },
  plugins: [],
};
