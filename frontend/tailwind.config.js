/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm neutral palette (light mode)
        background: "#FAFAF8",
        surface: "#FFFFFF",
        border: "#E6E6E2",
        text: {
          primary: "#1F1F1D",
          muted: "#9A9A95",
        },
        // Dark mode variants
        'dark-background': "#1A1A18",
        'dark-surface': "#252523",
        'dark-border': "#3A3A38",
        'dark-text': {
          primary: "#F5F5F3",
          muted: "#A0A09B",
        },
        // Soft mint accent (works well in both modes)
        accent: {
          DEFAULT: "#7BE495",
          light: "#A5F0B5",
          dark: "#5BCF7B",
        },
        // Disabled state
        disabled: "#BDBDB8",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
