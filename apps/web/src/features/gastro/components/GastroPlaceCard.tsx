import { Bike, Building2, Calendar, CalendarCheck, Clock, Crown, MapPin, MessageCircle, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { formatTodayHours } from "@/features/gastro/lib/openingHours";
import { GASTRO_TYPE_LABELS, type GastroPlace } from "@/features/gastro/types";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const VISIBLE_TYPE_BADGES = 3;

/**
 * Mismo criterio visual que PlanBadge en EventCard.tsx (Etapa 8b): pro
 * (Destacado Plus) gradiente + corona, dest (Destacado) sólido + estrella,
 * gratis sin badge.
 * Etapa 10b-1: ya no se renderiza dentro de `GastroPlaceCard` (misma
 * jerarquía visual por fondo/borde/miniatura que EventCard) — se mantiene
 * porque lo sigue usando `GastroDetailView.tsx`.
 */
export function GastroPlanBadge({ plan }: { plan: GastroPlace["plan"] }) {
  if (plan === "pro") {
    return (
      <Badge variant="pro" className="flex-shrink-0 gap-1">
        <Crown className="h-3 w-3" aria-hidden />
        Destacado Plus
      </Badge>
    );
  }
  if (plan === "dest") {
    return (
      <Badge variant="default" className="flex-shrink-0 gap-1">
        <Star className="h-3 w-3" aria-hidden />
        Destacado
      </Badge>
    );
  }
  return null;
}

function GastroTypeBadges({ types }: { types: string[] }) {
  const visible = types.slice(0, VISIBLE_TYPE_BADGES);
  const remaining = types.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((type) => {
        const style = GASTRO_TYPE_STYLES[type] ?? DEFAULT_GASTRO_TYPE_STYLE;
        return (
          <span
            key={type}
            className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: style.color }}
          >
            {GASTRO_TYPE_LABELS[type] ?? type}
          </span>
        );
      })}
      {remaining > 0 && (
        <span className="rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-4">+{remaining}</span>
      )}
    </div>
  );
}

/** Misma jerarquía visual que `planCardClasses` en EventCard.tsx — ver
 * comentario ahí, mismos valores calcados de `.lugar-card.dest`/`.plus`. */
function planCardClasses(plan: GastroPlace["plan"]): string {
  if (plan === "pro") {
    return "border-[1.75px] border-[#E91E8C99] border-l-[6px] border-l-brand-pink bg-[linear-gradient(160deg,#2a0d1f,#150910)]";
  }
  if (plan === "dest") {
    return "border-[1.5px] border-[#E91E8C77] bg-[linear-gradient(135deg,#E91E8C1a,#E91E8C08)]";
  }
  return "";
}

/** Google Maps: navegación directa por coordenadas si existen, si no
 * búsqueda por dirección + ciudad. `GastroPlace.address` es obligatorio en
 * el modelo, así que en la práctica siempre hay al menos una de las dos. */
function buildMapUrl(place: GastroPlace): string | null {
  if (place.latitude != null && place.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }
  if (place.address) {
    return `https://www.google.com/maps/search/${encodeURIComponent(`${place.address}, ${place.city_name}`)}`;
  }
  return null;
}

/** CTA "Reservar" diferenciado — solo Destacado Plus con WhatsApp cargado. */
function buildReservarUrl(place: GastroPlace): string | null {
  if (place.plan !== "pro" || !place.gastro_whatsapp) return null;
  const digits = place.gastro_whatsapp.replace(/\D/g, "");
  const message = `Hola, quiero hacer una reserva en ${place.name}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** La card entera es un `Link` (no se puede anidar `<a>` adentro, ver
 * comentario más abajo) — estos botones abren en pestaña nueva "a mano". */
function openInNewTab(e: MouseEvent, url: string) {
  e.preventDefault();
  e.stopPropagation();
  window.open(url, "_blank", "noopener,noreferrer");
}

interface GastroPlaceCardProps {
  place: GastroPlace;
}

export function GastroPlaceCard({ place }: GastroPlaceCardProps) {
  const style = GASTRO_TYPE_STYLES[place.gastro_types[0]] ?? DEFAULT_GASTRO_TYPE_STYLE;
  const Icon = style.icon;
  const coverUrl = resolveMediaUrl(place.cover_img_url);
  const todayHours = formatTodayHours(place.opening_hours);
  const isPro = place.plan === "pro";
  const mapUrl = buildMapUrl(place);
  const reservarUrl = buildReservarUrl(place);

  return (
    <Link href={`/lugares/${place.id}`} data-testid="gastro-place-card-link">
      <Card
        data-testid="gastro-place-card"
        className={cn("overflow-hidden transition-colors hover:border-primary/40", planCardClasses(place.plan))}
      >
        <CardContent className="flex items-center gap-3 p-3">
          {/* Destacado Plus: foto del local (cover_img_url) o placeholder —
              exclusivo de este nivel, igual criterio que la miniatura de
              flyer en EventCard.tsx. */}
          {isPro ? (
            coverUrl ? (
              <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-surface-2">
                <Building2 className="h-4 w-4 text-ink-4" aria-hidden />
              </div>
            )
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1a1a1a]">
              <Icon className="h-[18px] w-[18px]" style={{ color: style.color }} aria-hidden />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1 truncate text-sm font-bold text-foreground">
              <span className="truncate">{place.name}</span>
              {place.is_verified && (
                <ShieldCheck
                  className="h-3.5 w-3.5 flex-shrink-0 text-brand-green"
                  aria-label="Verificado"
                  data-testid="gastro-verified-icon"
                />
              )}
            </p>

            <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-4">
              <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
              {place.address}
            </p>

            {todayHours && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-4">
                <Clock className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
                {todayHours}
              </p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <GastroTypeBadges types={place.gastro_types} />
              {place.has_delivery && (
                <span className="flex items-center gap-1 rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3">
                  <Bike className="h-2.5 w-2.5" aria-hidden />
                  Delivery
                </span>
              )}
              {place.has_reservations && (
                <span className="flex items-center gap-1 rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3">
                  <CalendarCheck className="h-2.5 w-2.5" aria-hidden />
                  Reservas
                </span>
              )}
              {place.price_range && (
                <span className="rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3">
                  {place.price_range}
                </span>
              )}
            </div>

            {place.event_count > 0 && (
              // Toda la card ya es un Link a /lugares/{id} (no se puede anidar
              // otro <a> adentro) — la sección "Eventos en este lugar" del
              // detalle usa useLocationEvents con datos reales. Etapa 9a.
              <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary underline underline-offset-2">
                <Calendar className="h-3 w-3 flex-shrink-0" aria-hidden />
                Ver {place.event_count} evento{place.event_count === 1 ? "" : "s"}
              </p>
            )}

            {(reservarUrl || mapUrl) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {reservarUrl && (
                  <button
                    type="button"
                    onClick={(e) => openInNewTab(e, reservarUrl)}
                    data-testid="gastro-reservar-button"
                    className="flex items-center gap-1.5 rounded-lg bg-brand-whatsapp px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    Reservar
                  </button>
                )}
                {mapUrl && (
                  <button
                    type="button"
                    onClick={(e) => openInNewTab(e, mapUrl)}
                    data-testid="gastro-map-button"
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#378ADD44] bg-[#378ADD22] px-3 py-1.5 text-xs font-bold text-[#378ADD]"
                  >
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Llegar
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
