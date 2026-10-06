const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Resuelve una URL de media que puede venir absoluta (Supabase Storage en
 * producción, o cualquier otro storage externo) o relativa (fallback local
 * de development sin Supabase configurado — ver apps/api/app/core/storage.py).
 *
 * El backend guarda la ruta relativa a propósito: no puede saber en qué
 * origen es alcanzable públicamente (localhost, un túnel de ngrok,
 * producción...) — eso depende de dónde esté el que la mira, no del
 * servidor. Por eso la resolución final es responsabilidad del frontend,
 * contra la misma variable que ya usa para toda la API.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL.replace(/\/$/, "")}${url}`;
}

/**
 * P0-4 (PERFORMANCE_AUDIT.md) — indica si una URL de media puede pasar por
 * el optimizador de `next/image`. Tiene que coincidir con `images.remotePatterns`
 * de next.config.js: Supabase Storage (`*.supabase.co/storage/v1/object/public/`)
 * y el fallback local del backend (`{NEXT_PUBLIC_API_URL}/uploads/`).
 *
 * Todo lo demás se renderiza con `unoptimized` (la imagen se pide tal cual,
 * como el `<img>` de antes): banners pegados por el admin como URL externa
 * (dominio arbitrario, no se puede declarar en remotePatterns), GIFs
 * (pueden ser animados — el optimizador no los recomprime igual) y
 * previews locales `blob:`.
 */
export function isOptimizableMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (/\.gif$/i.test(parsed.pathname)) return false;
  if (parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co")) {
    return parsed.pathname.startsWith("/storage/v1/object/public/");
  }
  try {
    const api = new URL(API_URL);
    return parsed.origin === api.origin && parsed.pathname.startsWith("/uploads/");
  } catch {
    return false;
  }
}
