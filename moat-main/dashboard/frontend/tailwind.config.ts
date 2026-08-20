import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        /* PFS Gold — primary brand color */
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50:  "#fdf9ef",
          100: "#faf0d4",
          200: "#f4dfa0",
          300: "#ecca65",
          400: "#e4b53a",
          500: "#c9a84c",  /* core brand gold */
          600: "#b8921e",
          700: "#9a751a",
          800: "#7d5f1b",
          900: "#674e1a",
          950: "#3c2b0b",
        },
        /* PFS Accent — warm amber highlight */
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          50:  "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#c9a84c",
          600: "#b45309",
          700: "#92400e",
          800: "#78350f",
          900: "#451a03",
          950: "#1c0a00",
        },
        /* PFS Surface — dark olive tones */
        surface: {
          50:  "#f5f4ee",
          100: "#e8e5d5",
          200: "#ccc8b0",
          300: "#a8a285",
          400: "#7a7460",
          500: "#5e5948",
          600: "#3d3a2b",
          700: "#2a2a16",  /* border */
          800: "#1a1a0e",  /* card */
          900: "#131309",  /* background */
          950: "#0e0e07",  /* sidebar */
        },
        /* PFS mission category colors */
        "pfs-novelty":    "#4ade80",
        "pfs-prior-art":  "#60a5fa",
        "pfs-fto":        "#fb923c",
        "pfs-patent":     "#c084fc",
        "pfs-invalidity": "#f87171",
        "pfs-landscape":  "#2dd4bf",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        serif: ["Playfair Display", "serif"],
      },
      borderRadius: {
        xl:  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        gold:    "0 0 20px rgba(201,168,76,0.18), 0 4px 16px rgba(0,0,0,0.4)",
        "gold-lg": "0 0 40px rgba(201,168,76,0.24), 0 8px 32px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
