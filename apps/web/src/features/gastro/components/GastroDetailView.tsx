"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Bike,
  CalendarCheck,
  ChevronDown,
  Clock,
  Facebook as FacebookIcon,
  Flag,
  Globe,
  Instagram as InstagramIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Store,
} from "lucide-react";

import { ImageLightbox } from "@/components/ImageLightbox";
import { EventCard } from "@/features/events/components/EventCard";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { currentWeekdayInArgentina, formatTodayHours } from "@/features/gastro/lib/openingHours";
import { useLocationEvents } from "@/features/gastro/hooks/useLocationEvents";
import { GASTRO_TYPE_LABELS, WEEKDAYS, WEEKDAY_LABELS, type GastroPlace } from "@/features/gastro/types";
import { GastroPlanBadge, OpenHoursChip } from "@/features/gastro/components/GastroPlaceCard";
import { ReportPlaceModal } from "@/features/gastro/components/ReportPlaceModal";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const style = GASTRO_TYPE_STYLES[place.gastro_types[0]] ?? DEFAULT_GASTRO_TYPE_STYLE;
  const Icon = style.icon;
  const coverUrl = resolveMediaUrl(place.cover_img_url);
  const today = currentWeekdayInArgentina();
  // La imagen/logo ampliable (tap para ver en grande, ImageLightbox) es
  // exclusiva del plan Destacado Plus — mismo criterio que GastroPlaceCard.tsx
  // (la foto al costado de la card solo aparece para plan==="pro").
  const showCover = place.plan === "pro";

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
  const facebookHref = place.gastro_facebook
    ? place.gastro_facebook.startsWith("http")
      ? place.gastro_facebook
      : `https://facebook.com/${place.gastro_facebook.replace(/^@/, "")}`
    : null;
  const phoneHref = place.gastro_phone ? `tel:${place.gastro_phone.replace(/\s+/g, "")}` : null;
  const mapUrl = buildMapUrl(place);
  const reservarUrl = buildReservarUrl(place);

  return (
    <div className="flex flex-col gap-4">
      {showCover && (
        <>
          <button
            type="button"
            onClick={() => coverUrl && setLightboxOpen(true)}
            disabled={!coverUrl}
            data-testid="gastro-cover"
            className="flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#1a1a1a] disabled:cursor-default"
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt={place.name} className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-12 w-12" style={{ color: style.color }} aria-hidden />
            )}
          </button>
          {lightboxOpen && coverUrl && (
            <ImageLightbox src={coverUrl} alt={place.name} onClose={() => setLightboxOpen(false)} />
          )}
        </>
      )}

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
          si no, se muestra el texto libre `hours` como fallback. Arranca
          colapsado (solo estado + horario de hoy), igual criterio que
          togHorarioLd() en seSALE_v2.html; el bloque de 7 días existente
          se envuelve sin reimplementarlo. */}
      {place.opening_hours ? (
        <div className="rounded-xl border border-border bg-card" data-testid="gastro-weekly-hours">
          <button
            type="button"
            onClick={() => setHoursExpanded((expanded) => !expanded)}
            aria-expanded={hoursExpanded}
            aria-controls="gastro-hours-list"
            data-testid="gastro-hours-toggle"
            className="flex w-full items-center justify-between gap-2 p-3 text-left"
          >
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-4">
              <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
              Ver horarios de la semana
            </span>
            <span className="flex items-center gap-2">
              <OpenHoursChip place={place} />
              <span className="text-xs font-semibold text-ink-4">{formatTodayHours(place.opening_hours)}</span>
              <ChevronDown
                className={cn("h-4 w-4 flex-shrink-0 text-ink-4 transition-transform", hoursExpanded && "rotate-180")}
                aria-hidden
              />
            </span>
          </button>
          <div
            id="gastro-hours-list"
            className={cn(
              "grid transition-[grid-template-rows] duration-200 ease-in-out",
              hoursExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1 px-3 pb-3">
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
            </div>
          </div>
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

      {((whatsappHref && !reservarUrl) || instagramHref || webHref || emailHref || facebookHref || phoneHref) && (
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
          {phoneHref && (
            <a
              href={phoneHref}
              data-testid="gastro-phone-link"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <Phone className="h-4 w-4 text-foreground" aria-hidden />
              {place.gastro_phone}
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
          {facebookHref && (
            <a
              href={facebookHref}
              target="_blank"
              rel="noreferrer"
              data-testid="gastro-facebook-link"
              className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm font-semibold text-foreground"
            >
              <FacebookIcon className="h-4 w-4 text-[#4B93F5]" aria-hidden />
              Facebook
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

      <div className="flex flex-col gap-2 rounded-xl bg-surface-5 p-3">
        <p className="text-xs text-ink-4">
          ¿Este lugar cerró, cambió de dirección o algo no es correcto? Podés reportarlo.
        </p>
        <button
          type="button"
          onClick={() => setReportModalOpen(true)}
          data-testid="gastro-report-button"
          className="flex w-fit items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive"
        >
          <Flag className="h-3 w-3" aria-hidden />
          Reportar un problema
        </button>
      </div>

      {reportModalOpen && <ReportPlaceModal locationId={place.id} onClose={() => setReportModalOpen(false)} />}
    </div>
  );
}
