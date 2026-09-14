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
        // Etapa "Cambios de diseño TIPO A v2.2": --F/--FD/--FB actualizados a la
        // paleta de seSALE_v2.html. --blue (--AZ) NO se tocó — ver a_revisar.md
        // (reasignación a lime generaba conflicto semántico con usos reales de
        // este color en el frontend, no solo "mapa/cómo llegar" como en el HTML
        // de referencia).
        //
        // Etapa "Cambios de diseño TIPO B v2.2" (punto 3 — modo claro/oscuro):
        // pinkBg/lime/labelIcon pasan de hex fijo a `var(--FB)`/`var(--lime)`/
        // `var(--label-icon)` (definidas en globals.css, con valor distinto
        // por tema) para que los consumidores existentes (bg-brand-pinkBg,
        // text-brand-lime, etc.) reaccionen solos al toggle de tema sin tocar
        // cada archivo. --F/--FD (pink/pinkDark) NO cambian entre temas en
        // seSALE_v2.html, así que se dejan en hex fijo.
        brand: {
          pink: "#F2357B",
          pinkDark: "#c41f5e",
          pinkBg: "var(--FB)",
          green: "#1D9E75",
          whatsapp: "#25D366",
          amber: "#EF9F27",
          blue: "#378ADD",
          violet: "#7F77DD",
          orange: "#D85A30",
          teal: "#14B8A6",
          babyPink: "#FF8FA3",
          // Nuevas en seSALE_v2.html (--lime / --label-icon). --label-icon es
          // alias de --lime en la referencia; no se aplicó a ningún ícono
          // nuevo en la Etapa TIPO A (ver a_revisar.md) — sigue igual en esta
          // etapa (la extensión a labels de detalle está pospuesta).
          lime: "var(--lime)",
          labelIcon: "var(--label-icon)",
        },
        // Escala de superficies (--s0..--s6 en seSALE.html) — pasa a
        // `var(--sN)` para reaccionar al modo claro/oscuro (Etapa TIPO B,
        // punto 3). Los valores en sí (hex por tema) viven en globals.css.
        surface: {
          0: "var(--s0)",
          1: "var(--s1)",
          2: "var(--s2)",
          3: "var(--s3)",
          4: "var(--s4)",
          5: "var(--s5)",
          6: "var(--s6)",
        },
        // Escala de textos (--t1..--t5 en seSALE.html) — ídem, `var(--tN)`.
        ink: {
          1: "var(--t1)",
          2: "var(--t2)",
          3: "var(--t3)",
          4: "var(--t4)",
          5: "var(--t5)",
        },
        // --surround en seSALE_v2.html: fondo detrás del layout centrado de
        // desktop (Etapa TIPO B, punto 12) — `var(--surround)`, con valor
        // distinto por tema.
        surround: "var(--surround)",
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
