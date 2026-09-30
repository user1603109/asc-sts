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
        // Dark Navy Blue
        navy: {
          950: "#060D17",
          900: "#0A192F", // Core Dark Navy
          850: "#0F213D",
          800: "#132A4D",
          700: "#1E3A5F",
          600: "#2B4C7E",
        },
        // Yale Blue
        yale: {
          900: "#0B2D59",
          800: "#0D3E78",
          700: "#0F4C81", // Classic Yale Blue
          600: "#1565C0",
          500: "#1976D2",
          400: "#42A5F5",
          100: "#E3F2FD",
          50: "#F0F7FF",
        },
        // Lime Gold Yellow
        gold: {
          700: "#B8860B",
          600: "#D4A017",
          500: "#EAB308", // Core Lime Gold Yellow
          400: "#FACC15",
          300: "#FDE047",
          100: "#FEF9C3",
          50: "#FEFCE8",
        },
        // Canvas & Borders
        surface: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          card: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        card: "0 2px 6px -1px rgba(10, 25, 47, 0.06), 0 2px 4px -2px rgba(10, 25, 47, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
