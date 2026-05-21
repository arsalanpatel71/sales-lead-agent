/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        surface: "#1e1e2e",
        bg: "#13131f",
        border: "#2e2e4a",
        muted: "#6b7280",
      },
    },
  },
  plugins: [],
};
