import { useState } from "react";
import { Bike, Building2, Calendar, CalendarCheck, Clock, Crown, MapPin, MessageCircle, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ImageLightbox } from "@/components/ImageLightbox";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { formatTodayHours, isOpenNow } from "@/features/gastro/lib/openingHours";
import { GASTRO_TYPE_LABELS, type GastroPlace } from "@/features/gastro/types";
import { resolveMediaUrl } from "@/lib/media";

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

/** Etapa 10b-2: chip "Abierto ahora" (verde) / "Hoy: HH a HH hs" (gris) /
 * silencio — ver isOpenNow() y las reglas de la Parte 2 del pedido: nunca se
 * muestra "cerrado" en texto, el silencio ya comunica eso. */
function OpenHoursChip({ place }: { place: GastroPlace }) {
  const openNow = isOpenNow(place.opening_hours);
  const todayHours = formatTodayHours(place.opening_hours);

  if (openNow) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-brand-green" data-testid="gastro-open-now">
        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green" aria-hidden />
        Abierto ahora
      </span>
    );
  }
  if (todayHours && todayHours !== "Hoy: cerrado") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-4" data-testid="gastro-today-hours">
        <Clock className="h-2.5 w-2.5 flex-shrink-0" aria-hidden />
        {todayHours}
      </span>
    );
  }
  return null;
}

function GastroBadgesRow({ place }: { place: GastroPlace }) {
  if (!place.has_delivery && !place.has_reservations && !place.price_range) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
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
        <span className="rounded-full bg-surface-5 px-2 py-0.5 text-[9px] font-bold text-ink-3">{place.price_range}</span>
      )}
    </div>
  );
}

function GastroEventCountLink({ place }: { place: GastroPlace }) {
  if (place.event_count <= 0) return null;
  // Toda la card ya es un Link a /lugares/{id} (no se puede anidar otro <a>
  // adentro) — la sección "Eventos en este lugar" del detalle usa
  // useLocationEvents con datos reales. Etapa 9a.
  return (
    <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary underline underline-offset-2">
      <Calendar className="h-3 w-3 flex-shrink-0" aria-hidden />
      Ver {place.event_count} evento{place.event_count === 1 ? "" : "s"}
    </p>
  );
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

interface FooterActionsProps {
  reservarUrl: string | null;
  mapUrl: string | null;
}

/** Botones "Reservar"/"Llegar" — compartidos entre los templates Destacado
 * Plus y Destacado (mismo `.lc-foot` de seSALE.html). El template Gratis
 * usa su propia variante compacta (ver `GratisActions`). */
function CardFooterActions({ reservarUrl, mapUrl }: FooterActionsProps) {
  if (!reservarUrl && !mapUrl) return null;
  return (
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
  );
}

interface GastroPlaceCardProps {
  place: GastroPlace;
}

export function GastroPlaceCard({ place }: GastroPlaceCardProps) {
  const style = GASTRO_TYPE_STYLES[place.gastro_types[0]] ?? DEFAULT_GASTRO_TYPE_STYLE;
  const Icon = style.icon;
  const coverUrl = resolveMediaUrl(place.cover_img_url);
  const mapUrl = buildMapUrl(place);
  const reservarUrl = buildReservarUrl(place);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const nameRow = (
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
  );

  const addressLine = (
    <p className="mt-1 flex items-center gap-1 truncate text-xs text-ink-4">
      <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
      {place.address}
    </p>
  );

  // ── DESTACADO PLUS — foto/logo al costado (72×72, seSALE.html
  // `.lc-plus-img`), clickeable para ampliar en el lightbox. Sin foto
  // cargada: placeholder del mismo tamaño. ─────────────────────────────
  if (place.plan === "pro") {
    return (
      <>
        <Link href={`/lugares/${place.id}`} data-testid="gastro-place-card-link">
          <Card
            data-testid="gastro-place-card"
            className="overflow-hidden border-[1.75px] border-l-[6px] border-[#E91E8C99] border-l-brand-pink bg-[linear-gradient(160deg,#2a0d1f,#150910)] transition-colors hover:border-primary/40"
          >
            <CardContent className="flex flex-col gap-2.5 p-3">
              <div className="flex items-start gap-3">
                {coverUrl ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLightboxOpen(true);
                    }}
                    data-testid="gastro-photo-button"
                    className="h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-surface-2">
                    <Building2 className="h-6 w-6 text-ink-4" aria-hidden />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
                    <Icon className="h-3 w-3" aria-hidden />
                    {GASTRO_TYPE_LABELS[place.gastro_types[0]] ?? place.gastro_types[0]}
                  </p>
                  {nameRow}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
                <span className="flex min-w-0 items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
                  {place.address}
                </span>
                <OpenHoursChip place={place} />
              </div>

              <GastroTypeBadges types={place.gastro_types} />
              <GastroBadgesRow place={place} />
              <GastroEventCountLink place={place} />
              <CardFooterActions reservarUrl={reservarUrl} mapUrl={mapUrl} />
            </CardContent>
          </Card>
        </Link>
        {lightboxOpen && coverUrl && (
          <ImageLightbox src={coverUrl} alt={place.name} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  // ── DESTACADO — sin foto (exclusiva de Destacado Plus): mismo fondo
  // degradé rosa + borde que se aplicó en 10b-1, sin ícono/avatar. ─────
  if (place.plan === "dest") {
    return (
      <Link href={`/lugares/${place.id}`} data-testid="gastro-place-card-link">
        <Card
          data-testid="gastro-place-card"
          className="overflow-hidden border-[1.5px] border-[#E91E8C77] bg-[linear-gradient(135deg,#E91E8C1a,#E91E8C08)] transition-colors hover:border-primary/40"
        >
          <CardContent className="flex flex-col gap-2.5 p-3">
            <div>
              <p className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: style.color }}>
                <Icon className="h-3 w-3" aria-hidden />
                {GASTRO_TYPE_LABELS[place.gastro_types[0]] ?? place.gastro_types[0]}
              </p>
              {nameRow}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-4">
              <span className="flex min-w-0 items-center gap-1 truncate">
                <MapPin className="h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
                {place.address}
              </span>
              <OpenHoursChip place={place} />
            </div>

            <GastroTypeBadges types={place.gastro_types} />
            <GastroBadgesRow place={place} />
            <GastroEventCountLink place={place} />
            <CardFooterActions reservarUrl={reservarUrl} mapUrl={mapUrl} />
          </CardContent>
        </Card>
      </Link>
    );
  }

  // ── GRATIS — ficha compacta, sin foto ni decoración de plan: fila con
  // ícono 40×40, nombre, tipos, horario de hoy y badges. ────────────────
  return (
    <Link href={`/lugares/${place.id}`} data-testid="gastro-place-card-link">
      <Card data-testid="gastro-place-card" className="overflow-hidden transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1a1a1a]">
            <Icon className="h-[18px] w-[18px]" style={{ color: style.color }} aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            {nameRow}
            {addressLine}
            <OpenHoursChip place={place} />

            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <GastroTypeBadges types={place.gastro_types} />
              <GastroBadgesRow place={place} />
            </div>

            <GastroEventCountLink place={place} />
            <CardFooterActions reservarUrl={reservarUrl} mapUrl={mapUrl} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
