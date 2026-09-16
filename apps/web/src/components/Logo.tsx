import { useId } from "react";

import { cn } from "@/lib/utils";

interface LogoProps {
  /** "sm" — Navbar (marca siempre oscura, ver comentario en Navbar.tsx).
   *  "lg" — pantallas de un solo logo grande (ej. /proximamente). */
  size?: "sm" | "lg";
  /** "dark" (default) — "se" en gris oscuro, para fondos claros (Navbar,
   *  que siempre queda fijo en tema claro — ver `.sesale-navbar-fixed-light`
   *  en globals.css). "light" — "se" en blanco (`logo-sesale-light.png`,
   *  generado a partir del original recoloreando solo el glyph oscuro,
   *  "Sale." se mantiene rosa en los dos), para fondos oscuros fijos como
   *  el hero de "¿Qué es seSale?" (`.qe-logo-img` en seSALE_v2.html usa un
   *  asset White-on-dark separado del logo del nav, por la misma razón:
   *  con el original, "se" casi no se lee sobre un fondo oscuro). */
  tone?: "dark" | "light";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "h-[30px]",
  lg: "h-[48px]",
};

// Proporción real del asset (viewBox del SVG original: 1000 x 239.06).
const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 239.06;

/**
 * Logo "seSale" — componente único reutilizado por Navbar.tsx y
 * ProximamenteContent.tsx (antes cada uno tenía el mismo markup duplicado).
 *
 * Etapa "Logo: usar la imagen original en vez del texto animado con CSS":
 * el dibujo de marca no es una fuente web, es un asset diseñado a mano
 * (apps/web/public/logo-sesale.png, extraído del <mask> en base64 de
 * seSALE_v2.html — ver a_revisar.md por las dimensiones/peso). Una etapa
 * anterior ("Cambios de diseño TIPO B v2.2", punto 1) había portado el
 * logo como texto real (Inter Black) + animación CSS para evitar el PNG
 * embebido, pero el texto no logra el mismo peso visual que el dibujo
 * original — de ahí este reemplazo.
 *
 * La animación de la referencia (reveal de izquierda a derecha al montar,
 * ~2.36s, + brillo en loop cada 5.4s) se mantiene, pero aplicada sobre el
 * <image> real en vez de sobre texto: un <rect> con clip-path que crece en
 * ancho (revela la imagen), y un grupo con gradientes radiales enmascarado
 * por la silueta del propio PNG (mask="url(#...)") que se traslada en
 * loop. Ver `.sesale-logo-reveal-rect` / `.sesale-logo-shine-*` en
 * globals.css. `prefers-reduced-motion: reduce` deshabilita ambas
 * animaciones y muestra el logo completo y estático.
 *
 * El logo no reacciona al tema claro/oscuro: es una imagen de colores
 * fijos (igual que en la referencia, donde el nav/marca se mantiene
 * siempre oscuro/fijo) — es intencional, no hay que hacerlo variar.
 */
export function Logo({ size = "sm", tone = "dark", className }: LogoProps) {
  const logoSrc = tone === "light" ? "/logo-sesale-light.png" : "/logo-sesale.png";
  const uid = useId();
  const clipId = `logo-clip-${uid}`;
  const maskId = `logo-mask-${uid}`;
  const glowId = `logo-glow-${uid}`;
  const shineId = `logo-shine-${uid}`;
  const glintId = `logo-glint-${uid}`;
  const softBlurId = `logo-soft-blur-${uid}`;
  const midBlurId = `logo-mid-blur-${uid}`;

  return (
    <svg
      role="img"
      aria-label="seSale"
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      className={cn("block w-auto max-w-[38vw]", SIZE_CLASSES[size], className)}
    >
      <title>seSale</title>
      <defs>
        <clipPath id={clipId}>
          <rect
            className="sesale-logo-reveal-rect"
            x="0"
            y="-30"
            width="0"
            height="300"
          />
        </clipPath>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={shineId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity=".55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={glintId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="35%" stopColor="#fff" stopOpacity=".7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={softBlurId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id={midBlurId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT}>
          <image
            href="/logo-sesale.png"
            x="0"
            y="0"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
          />
        </mask>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <image
          data-testid="logo-image"
          href={logoSrc}
          x="0"
          y="0"
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
        />
      </g>

      <g className="sesale-logo-shine-layer" mask={`url(#${maskId})`} aria-hidden>
        <g className="sesale-logo-shine-translate">
          <ellipse
            cx="-260"
            cy="120"
            rx="115"
            ry="260"
            transform="rotate(-16 -260 120)"
            fill={`url(#${glowId})`}
            filter={`url(#${softBlurId})`}
          />
          <ellipse
            cx="-270"
            cy="120"
            rx="42"
            ry="235"
            transform="rotate(-16 -270 120)"
            fill={`url(#${shineId})`}
            filter={`url(#${midBlurId})`}
          />
          <ellipse
            cx="-278"
            cy="120"
            rx="10"
            ry="150"
            transform="rotate(-16 -278 120)"
            fill={`url(#${glintId})`}
          />
        </g>
      </g>
    </svg>
  );
}
