/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        board: {
          light: "#eeeed2",
          dark: "#769656"
        }
      },
      boxShadow: {
        calm: "0 16px 50px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
};
