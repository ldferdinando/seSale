import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Paleta seSALE — tomada 1:1 de seSALE.html (variables --F, --V, --AM, etc.)
        brand: {
          pink: "#E91E8C",
          pinkDark: "#c4166f",
          pinkBg: "#1a0d14",
          green: "#1D9E75",
          whatsapp: "#25D366",
          amber: "#EF9F27",
          blue: "#378ADD",
          violet: "#7F77DD",
          orange: "#D85A30",
          teal: "#14B8A6",
          babyPink: "#FF8FA3",
        },
        // Escala de superficies (--s0..--s6 en seSALE.html)
        surface: {
          0: "#0d0d0d",
          1: "#111111",
          2: "#1a1a1a",
          3: "#222222",
          4: "#2a2a2a",
          5: "#383838",
          6: "#555555",
        },
        // Escala de textos (--t1..--t5 en seSALE.html)
        ink: {
          1: "#ffffff",
          2: "#cccccc",
          3: "#888888",
          4: "#666666",
          5: "#444444",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
