import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f4f6f2",
          100: "#e6ebe0",
          200: "#d0dac5",
          300: "#aebfa2",
          400: "#8ba37e",
          500: "#6d8662",
          600: "#556b48",
          700: "#43553b",
          800: "#384532",
          900: "#303a2c",
        },
        cream: "#faf8f5",
        warm: "#f5f0e8",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
