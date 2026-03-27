/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#04111f",
        panel: "#0b1a2b",
        panelSoft: "#10243b",
        line: "#1f3b5d",
        cyan: "#7de2d1",
        blue: "#59a7ff",
        orange: "#ff9d43",
        red: "#ff5f79",
        lime: "#9eed81",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(125, 226, 209, 0.18), 0 20px 60px rgba(3, 11, 25, 0.65)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(125, 226, 209, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 226, 209, 0.08) 1px, transparent 1px)",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Manrope'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

