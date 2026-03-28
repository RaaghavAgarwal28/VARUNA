/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        panel: "#0A0A0A",
        panelSoft: "#111111",
        line: "#1A1A1A",
        orange: "#ff9d43",
        red: "#ff5f79",
        
        // VARUNA unified premium palette
        framer: {
          light: "#FAF9F6",
          dark: "#000000",
          cardLight: "#FFFFFF",
          cardDark: "#0A0A0A",
          borderLight: "#E5E5E5",
          borderDark: "#222222",
          textLight: "#111111",
          textLightSoft: "#666666",
          textDark: "#FFFFFF",
          textDarkSoft: "#888888",
          accent: "#FF4500",
          accentHover: "#E03C00",
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255, 69, 0, 0.12), 0 20px 60px rgba(0, 0, 0, 0.65)",
        "framer-light": "0 20px 40px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0,0,0,0.02)",
        "framer-dark": "0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(255, 69, 0, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 69, 0, 0.04) 1px, transparent 1px)",
        "grid-dark": "linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
        "grid-light": "linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px)",
      },
      fontFamily: {
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "sans-serif"],
        body: ["Inter", "-apple-system", "BlinkMacSystemFont", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [],
};
