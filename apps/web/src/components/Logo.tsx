import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { preload } from "react-dom";

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

// La silueta que recorta el brillo va como `mask-image` de CSS y no como
// `<mask><image href>` de SVG: un `<image>` de SVG es candidato a LCP (y
// Chrome lo elegía como elemento LCP aunque fuera solo la máscara de una
// capa decorativa); una `mask-image` de CSS no lo es. `luminance` replica el
// modo por defecto de `<mask>` en SVG, así el brillo se ve igual que antes.
const SHINE_MASK_STYLE: CSSProperties = {
  maskImage: "url(/logo-sesale.png)",
  maskMode: "luminance",
  maskSize: "contain",
  maskRepeat: "no-repeat",
  maskPosition: "center",
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

interface LightSweepProps {
  glowId: string;
  shineId: string;
  glintId: string;
  softBlurId: string;
  midBlurId: string;
}

// Banda de luz (halo + brillo + destello) que barre el logo de izquierda a
// derecha. La usan tanto la pasada de "reveal" como el brillo en loop.
function LightSweep({ glowId, shineId, glintId, softBlurId, midBlurId }: LightSweepProps) {
  return (
    <>
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
    </>
  );
}

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
 * La animación de la referencia (pasada de izquierda a derecha al montar,
 * ~2.36s, + brillo en loop cada 5.4s) se aplica con gradientes radiales
 * enmascarados por la silueta del propio PNG (`mask-image` de CSS) que se
 * trasladan. Ver `.sesale-logo-reveal-sweep` / `.sesale-logo-shine-*` en
 * globals.css.
 *
 * Etapa "Logo: variante para modo oscuro": el logo pasó a reaccionar al
 * tema activo (`useTheme`) cuando no se pasa `tone` explícito — asset con
 * "se" oscuro en tema claro, blanco en tema oscuro (`logo-sesale-dark.png`,
 * extraído de seSALE.html igual que el resto — ver a_revisar.md). `tone`
 * sigue existiendo para fondos que no siguen el tema global de la app (ej.
 * el hero fijo-oscuro de "¿Qué es seSale?").
 *
 * Fix "el logo deja de ser el elemento LCP" — carga en dos tiempos:
 *
 * 1. El logo base es un `<img>` HTML (no un `<image>` dentro de un SVG),
 *    siempre visible y completo desde el primer frame, con `preload` en el
 *    `<head>` + `fetchPriority="high"`. Un `<image>` de SVG no lo descubre
 *    el preload scanner del navegador (se pedía recién después del CSS/JS,
 *    con prioridad baja), y el `clipPath` del reveal arrancaba en ancho 0,
 *    así que el primer pintado del logo visible era vacío.
 * 2. Las animaciones (pasada de luz del "reveal" + brillo en loop) viven en
 *    un overlay (SVG recortado con `mask-image` de CSS) que se monta
 *    recién cuando el `<img>` ya cargó y pasaron dos frames (o sea: ya se
 *    pintó). No ocultan nada del logo:
 *    corren encima como un extra. Con `prefers-reduced-motion: reduce` el
 *    overlay ni se monta (y globals.css además desactiva las animaciones).
 *
 * Ver a_revisar.md → "Fix: el logo deja de ser el elemento LCP".
 */
export function Logo({ size = "sm", tone, className }: LogoProps) {
  const { theme } = useTheme();
  const logoSrc = tone ? TONE_LOGO_SRC[tone] : THEME_LOGO_SRC[theme];
  preload(logoSrc, { as: "image", fetchPriority: "high" });

  const imgRef = useRef<HTMLImageElement>(null);
  const [isPainted, setIsPainted] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || prefersReducedMotion()) return undefined;

    let firstFrame = 0;
    let secondFrame = 0;
    // Dos rAF: el primero corre antes del próximo pintado, el segundo
    // después — garantiza que el logo ya está en pantalla.
    const startAfterPaint = () => {
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setIsPainted(true));
      });
    };

    if (img.complete && img.naturalWidth > 0) {
      startAfterPaint();
    } else {
      img.addEventListener("load", startAfterPaint, { once: true });
    }

    return () => {
      img.removeEventListener("load", startAfterPaint);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);

  const uid = useId();
  const sweepIds: LightSweepProps = {
    glowId: `logo-glow-${uid}`,
    shineId: `logo-shine-${uid}`,
    glintId: `logo-glint-${uid}`,
    softBlurId: `logo-soft-blur-${uid}`,
    midBlurId: `logo-mid-blur-${uid}`,
  };

  return (
    <span className={cn("relative block", className)}>
      {/* <img> y no next/image: asset local chico (12–32 KB) con preload
          propio; next/image agregaría un hop por /_next/image. */}
      <img
        ref={imgRef}
        data-testid="logo-image"
        src={logoSrc}
        alt="seSale"
        width={VIEWBOX_WIDTH}
        height={Math.round(VIEWBOX_HEIGHT)}
        fetchPriority="high"
        className={cn("block w-auto max-w-[38vw] object-contain", SIZE_CLASSES[size])}
      />

      {isPainted && (
        <span
          data-testid="logo-animation"
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={SHINE_MASK_STYLE}
        >
          <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} className="block h-full w-full">
            <defs>
              <radialGradient id={sweepIds.glowId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={sweepIds.shineId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="55%" stopColor="#fff" stopOpacity=".55" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={sweepIds.glintId} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="35%" stopColor="#fff" stopOpacity=".7" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <filter id={sweepIds.softBlurId} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="14" />
              </filter>
              <filter id={sweepIds.midBlurId} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            <g className="sesale-logo-reveal-sweep">
              <LightSweep {...sweepIds} />
            </g>
            <g className="sesale-logo-shine-layer">
              <g className="sesale-logo-shine-translate">
                <LightSweep {...sweepIds} />
              </g>
            </g>
          </svg>
        </span>
      )}
    </span>
  );
}
