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
