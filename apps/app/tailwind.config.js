/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#f5f5f5",
        foreground: "#111111",
        primary: { DEFAULT: "#111111", foreground: "#ffffff" },
        secondary: { DEFAULT: "#f5f5f5", foreground: "#555555" },
        muted: { DEFAULT: "#f0f0f0", foreground: "#999999" },
        accent: { DEFAULT: "#7c3aed", foreground: "#ffffff" },
        destructive: { DEFAULT: "#ef4444", foreground: "#ffffff" },
        success: "#22c55e",
        wish: "#ec4899",
        border: "#eeeeee",
        input: "#f5f5f5",
        card: { DEFAULT: "#ffffff", foreground: "#111111" },
      },
    },
  },
  plugins: [],
};
