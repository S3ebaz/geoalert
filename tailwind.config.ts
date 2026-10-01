import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        alert: {
          red: "#b91c1c",
          amber: "#d97706",
          green: "#15803d"
        }
      }
    }
  },
  plugins: []
};

export default config;
