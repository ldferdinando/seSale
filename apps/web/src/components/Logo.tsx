import { useId } from "react";

import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** "sm" — Navbar. "lg" — pantallas de un solo logo grande (ej.
   *  /proximamente). */
  size?: "sm" | "lg";
  /** Sin especificar (default) — el logo sigue el tema activo de la app
   *  (`useTheme`): "se" en gris oscuro en tema claro, en blanco en tema
   *  oscuro (`logo-sesale-dark.png`). Pasar "dark"/"light" explícito fuerza
   *  una variante fija, ignorando el tema — para fondos que no siguen el
   *  tema global, como el hero de "¿Qué es seSale?" (fondo oscuro fijo,
   *  `tone="light"`; `logo-sesale-light.png`, "se" en blanco, "Sale." se
   *  mantiene rosa en las tres variantes). */
  tone?: "dark" | "light";
  className?: string;
}

// Asset fijo cuando se pasa `tone` explícito (ignora el tema activo).
const TONE_LOGO_SRC: Record<"dark" | "light", string> = {
  dark: "/logo-sesale.png",
  light: "/logo-sesale-light.png",
};

// Asset cuando el logo sigue el tema activo (sin `tone` explícito). No
// confundir con TONE_LOGO_SRC.light: es un asset distinto (ver comentario
// de `tone` en LogoProps).
const THEME_LOGO_SRC: Record<"dark" | "light", string> = {
  light: "/logo-sesale.png",
  dark: "/logo-sesale-dark.png",
};

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
 * Etapa "Logo: variante para modo oscuro": el logo pasó a reaccionar al
 * tema activo (`useTheme`) cuando no se pasa `tone` explícito — asset con
 * "se" oscuro en tema claro, blanco en tema oscuro (`logo-sesale-dark.png`,
 * extraído de seSALE.html igual que el resto — ver a_revisar.md). `tone`
 * sigue existiendo para fondos que no siguen el tema global de la app (ej.
 * el hero fijo-oscuro de "¿Qué es seSale?").
 */
export function Logo({ size = "sm", tone, className }: LogoProps) {
  const { theme } = useTheme();
  const logoSrc = tone ? TONE_LOGO_SRC[tone] : THEME_LOGO_SRC[theme];
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
