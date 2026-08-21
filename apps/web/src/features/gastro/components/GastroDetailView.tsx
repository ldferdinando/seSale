"use client";

import dynamic from "next/dynamic";
import {
  Bike,
  CalendarCheck,
  Clock,
  Globe,
  Instagram as InstagramIcon,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Store,
} from "lucide-react";

import { EventCard } from "@/features/events/components/EventCard";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { currentWeekdayInArgentina } from "@/features/gastro/lib/openingHours";
import { useLocationEvents } from "@/features/gastro/hooks/useLocationEvents";
import { GASTRO_TYPE_LABELS, WEEKDAYS, WEEKDAY_LABELS, type GastroPlace } from "@/features/gastro/types";
import { GastroPlanBadge } from "@/features/gastro/components/GastroPlaceCard";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

interface GastroDetailViewProps {
  place: GastroPlace;
}

/** Mismo criterio que `buildMapUrl`/`buildReservarUrl` en GastroPlaceCard.tsx. */
function buildMapUrl(place: GastroPlace): string | null {
  if (place.latitude != null && place.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }
  if (place.address) {
    return `https://www.google.com/maps/search/${encodeURIComponent(`${place.address}, ${place.city_name}`)}`;
  }
  return null;
}

function buildReservarUrl(place: GastroPlace): string | null {
  if (place.plan !== "pro" || !place.gastro_whatsapp) return null;
  const digits = place.gastro_whatsapp.replace(/\D/g, "");
  const message = `Hola, quiero hacer una reserva en ${place.name}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function shareGastroPlace(place: GastroPlace) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/lugares/${place.id}` : "";
  const title = `${place.name} — seSALE`;
  const text = `${place.name} — encontralo en seSALE: ${url}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

export function GastroDetailView({ place }: GastroDetailViewProps) {
  const { data: locationEvents } = useLocationEvents(place.event_count > 0 ? place.id : undefined);
  const upcomingEvents = (locationEvents ?? []).slice(0, 3);

  const style = GASTRO_TYPE_STYLES[place.gastro_types[0]] ?? DEFAULT_GASTRO_TYPE_STYLE;
  const Icon = style.icon;
  const coverUrl = resolveMediaUrl(place.cover_img_url);
  const today = currentWeekdayInArgentina();

  const whatsappHref = place.gastro_whatsapp
    ? `https://wa.me/${place.gastro_whatsapp.replace(/\D/g, "")}`
    : null;
  const instagramHref = place.gastro_instagram
    ? `https://instagram.com/${place.gastro_instagram.replace(/^@/, "")}`
    : null;
  const webHref = place.gastro_web
    ? place.gastro_web.startsWith("http")
      ? place.gastro_web
      : `https://${place.gastro_web}`
    : null;
  const emailHref = place.gastro_email ? `mailto:${place.gastro_email}` : null;
  const mapUrl = buildMapUrl(place);
  const reservarUrl = buildReservarUrl(place);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#1a1a1a]"
        data-testid="gastro-cover"
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={place.name} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-12 w-12" style={{ color: style.color }} aria-hidden />
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-lg font-extrabold text-foreground">
            <span className="truncate">{place.name}</span>
            {place.is_verified && (
              <ShieldCheck
                className="h-4 w-4 flex-shrink-0 text-brand-green"
                aria-label="Verificado"
                data-testid="gastro-verified-icon"
              />
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
            {place.address}
          </p>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="gastro-map-link"
              className="mt-1 flex items-center gap-1.5 text-xs font-bold text-primary underline underline-offset-2"
            >
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              Cómo llegar
            </a>
          )}
        </div>
        <GastroPlanBadge plan={place.plan} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {place.gastro_types.map((type) => {
          const typeStyle = GASTRO_TYPE_STYLES[type] ?? DEFAULT_GASTRO_TYPE_STYLE;
          return (
            <span
              key={type}
              className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: typeStyle.color }}
            >
              {GASTRO_TYPE_LABELS[type] ?? type}
            </span>
          );
        })}
      </div>

      {place.description && <p className="text-sm text-ink-2">{place.description}</p>}

      <div className="flex flex-wrap gap-2">
        {place.has_delivery && (
          <span className="flex items-center gap-1 rounded-full bg-surface-5 px-2.5 py-1 text-xs font-semibold text-ink-2">
            <Bike className="h-3.5 w-3.5" aria-hidden />
            Delivery
          </span>
        )}
        {place.has_reservations && (
          <span className="flex items-center gap-1 rounded-full bg-surface-5 px-2.5 py-1 text-xs font-semibold text-ink-2">
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Reservas
          </span>
        )}
        {place.price_range && (
          <span className="rounded-full bg-surface-5 px-2.5 py-1 text-xs font-semibold text-ink-2">
            {place.price_range}
          </span>
        )}
      </div>

      {/* Horarios — completos por día si opening_hours viene estructurado;
          si no, se muestra el texto libre `hours` como fallback. */}
      {place.opening_hours ? (
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3" data-testid="gastro-weekly-hours">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-4">
            <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
            Horarios
          </p>
          {WEEKDAYS.map((day) => {
            const hours = place.opening_hours?.[day];
            return (
              <div
                key={day}
                data-testid={`gastro-hours-${day}`}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2 py-1 text-sm",
                  day === today ? "bg-primary/10 font-bold text-foreground" : "text-ink-3",
                )}
              >
                <span>{WEEKDAY_LABELS[day]}</span>
                <span>{hours ? `${hours.open} a ${hours.close} hs` : "Cerrado"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        place.hours && (
          <p className="flex items-start gap-1.5 text-sm text-ink-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
            {place.hours}
          </p>
        )
      )}

      {reservarUrl && (
        <a
          href={reservarUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="gastro-reservar-button"
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-whatsapp p-3 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Reservar por WhatsApp
        </a>
      )}

      {((whatsappHref && !reservarUrl) || instagramHref || webHref || emailHref) && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-5">Contacto</p>
          {/* Etapa 10b-1: si ya se muestra el CTA "Reservar" (arriba, plan pro
              con WhatsApp) no se repite el link genérico de WhatsApp acá. */}
          {whatsappHref && !reservarUrl && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <MessageCircle className="h-4 w-4 text-[#25D366]" aria-hidden />
              WhatsApp
            </a>
          )}
          {instagramHref && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <InstagramIcon className="h-4 w-4 text-[#E91E8C]" aria-hidden />
              Instagram
            </a>
          )}
          {webHref && (
            <a
              href={webHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <Globe className="h-4 w-4 text-[#378ADD]" aria-hidden />
              Sitio web
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <Mail className="h-4 w-4 text-[#7F77DD]" aria-hidden />
              Email
            </a>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => shareGastroPlace(place)}
        data-testid="gastro-share-button"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 text-sm font-bold text-ink-2"
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Compartir
      </button>

      {place.latitude != null && place.longitude != null && (
        <MapPicker
          latitude={place.latitude}
          longitude={place.longitude}
          onLocationSelect={() => {}}
          readonly
          heightClassName="h-[220px]"
        />
      )}

      {upcomingEvents.length > 0 && (
        <div className="flex flex-col gap-2" data-testid="gastro-place-events">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-4">
            <Store className="h-3.5 w-3.5 text-primary" aria-hidden />
            Eventos en este lugar
          </p>
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
