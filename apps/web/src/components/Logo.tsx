import { cn } from "@/lib/utils";

interface LogoProps {
  /** "sm" — Navbar (marca siempre oscura, ver comentario en Navbar.tsx).
   *  "lg" — pantallas de un solo logo grande (ej. /proximamente). */
  size?: "sm" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, { text: string; dot: string }> = {
  sm: { text: "text-xl", dot: "mb-1 h-[7px] w-[7px]" },
  lg: { text: "text-3xl", dot: "mb-1.5 h-2 w-2" },
};

/**
 * Logo "seSALE" — componente único reutilizado por Navbar.tsx y
 * ProximamenteContent.tsx (antes cada uno tenía el mismo markup duplicado).
 * Etapa "Cambios de diseño TIPO B v2.2" (punto 1): agrega la animación de
 * entrada (barrido de revelado) + brillo en loop de seSALE_v2.html, en una
 * versión simplificada en CSS puro — ver el comentario extenso en
 * globals.css (`.sesale-logo-reveal`/`.sesale-logo-shine`) sobre por qué no
 * se portó el SVG con máscara raster 1:1, y a_revisar.md. Respeta
 * `prefers-reduced-motion` (deshabilita ambas animaciones y muestra el logo
 * completo, igual que el bloque `@media (prefers-reduced-motion: reduce)`
 * de la referencia).
 */
export function Logo({ size = "sm", className }: LogoProps) {
  const sizes = SIZE_CLASSES[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)} aria-label="seSALE">
      <span className="sesale-logo-reveal inline-flex items-center gap-0.5">
        <span className={cn("font-black tracking-tight text-foreground", sizes.text)}>se</span>
        <span className={cn("sesale-logo-shine font-black tracking-tight", sizes.text)}>SALE</span>
      </span>
      <span
        className={cn("flex-shrink-0 animate-pulse rounded-full bg-primary", sizes.dot)}
        aria-hidden
      />
    </span>
  );
}
