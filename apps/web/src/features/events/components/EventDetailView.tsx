"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Clock,
  Flag,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  MessageCircle,
  Instagram as InstagramIcon,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  ZoomIn,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import {
  isRelevantOrganizerSubscription,
  OrganizerSubscriptionBadge,
} from "@/features/events/components/OrganizerSubscriptionBadge";
import { ReportEventModal } from "@/features/events/components/ReportEventModal";
import { EVENT_CATEGORIES } from "@/features/events/types";
import type { EventDetail } from "@/features/events/types";
import { formatEventTime, toEventDateTimeISO } from "@/lib/date-helpers";
import { resolveMediaUrl } from "@/lib/media";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

interface EventDetailViewProps {
  event: EventDetail;
}

const TICKET_TYPE_LABEL: Record<EventDetail["ticket_type"], string> = {
  gratis: "Entrada gratuita",
  pago: "Entrada paga",
  anticipo: "Con anticipo",
};

/** Etapa 8c — nombre público del plan en el banner de vencimiento. Mismo
 * texto que ya usan EventCard.tsx/publishPlans.ts, declarado acá inline
 * para no acoplar este componente a esos módulos de otros flujos. */
const PLAN_NAME: Record<"dest" | "pro", string> = {
  dest: "Destacado",
  pro: "Destacado Plus",
};

function shareEvent(event: EventDetail) {
  const eventDate = parseISO(event.date);
  const dateLabel = format(eventDate, "EEEE d 'de' MMMM", { locale: es });
  const timeLabel = formatEventTime(toEventDateTimeISO(event.date, event.time));
  const url = typeof window !== "undefined" ? `${window.location.origin}/eventos/${event.id}` : "";
  const title = `${event.title} — seSALE`;
  const text = `${event.title} · ${dateLabel} · ${timeLabel} hs · ${event.location.name}. ¡Organicemos para ir! Lo vi en seSALE: ${url}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
}

export function EventDetailView({ event }: EventDetailViewProps) {
  const { data: currentUser } = useCurrentUser();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const style = CATEGORY_STYLES[event.categories[0]] ?? DEFAULT_CATEGORY_STYLE;
  const Icon = style.icon;
  const categoryLabels = event.categories.map(
    (value) => EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? value,
  );
  const eventDate = parseISO(event.date);

  const canEdit = Boolean(currentUser && (currentUser.id === event.organizer_id || currentUser.role === "admin"));
  const isOwner = Boolean(currentUser && currentUser.id === event.organizer_id);

  const whatsappHref = event.contact_whatsapp
    ? `https://wa.me/${event.contact_whatsapp.replace(/\D/g, "")}`
    : null;
  const instagramHref = event.contact_instagram
    ? `https://instagram.com/${event.contact_instagram.replace(/^@/, "")}`
    : null;
  const webHref = event.contact_web
    ? event.contact_web.startsWith("http")
      ? event.contact_web
      : `https://${event.contact_web}`
    : null;
  const emailHref = event.contact_email ? `mailto:${event.contact_email}` : null;

  // Etapa 8b — el flyer es exclusivo del plan Destacado Plus (ver
  // a_revisar.md): "pro" con flyer_url es clickable (lightbox), "dest" con
  // flyer_url (caso raro: downgrade de plan sin borrar el flyer) se muestra
  // sin lightbox, y "gratis" nunca muestra imagen aunque flyer_url tenga
  // valor (no debería pasar, pero el backend no lo garantiza).
  const flyerUrl = resolveMediaUrl(event.flyer_url);
  const showFlyerImage = event.plan !== "gratis" && Boolean(flyerUrl);
  const flyerClickable = event.plan === "pro" && Boolean(flyerUrl);

  // Etapa 8c — aviso de vencimiento del plan pagado, solo para el
  // organizador dueño del evento. featured_until=null (plan activo sin
  // fecha, ej. asignado a mano por un admin) no muestra nada.
  const featuredUntilDate = event.featured_until ? parseISO(event.featured_until) : null;
  const now = new Date();
  const isExpiringSoon = Boolean(featuredUntilDate && featuredUntilDate > now && featuredUntilDate <= addDays(now, 7));
  const isExpired = Boolean(featuredUntilDate && featuredUntilDate <= now);
  const showExpiryBanner = isOwner && event.plan !== "gratis" && (isExpiringSoon || isExpired);
  const planName = event.plan === "pro" ? PLAN_NAME.pro : PLAN_NAME.dest;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-0">
        {showFlyerImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flyerUrl ?? undefined}
              alt={event.title}
              onClick={flyerClickable ? () => setLightboxOpen(true) : undefined}
              className={`h-full w-full object-cover ${flyerClickable ? "cursor-pointer" : ""}`}
            />
            {flyerClickable && (
              <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">
                <ZoomIn className="h-3.5 w-3.5" aria-hidden />
                Ver flyer
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center" data-testid="flyer-placeholder">
            <ImageIcon className="h-10 w-10 text-ink-5" aria-hidden />
          </div>
        )}
      </div>

      {flyerClickable && lightboxOpen && flyerUrl && (
        <ImageLightbox src={flyerUrl} alt={event.title} onClose={() => setLightboxOpen(false)} />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5">
          {categoryLabels.map((label, index) => (
            <div
              key={label}
              className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: CATEGORY_STYLES[event.categories[index]]?.color ?? style.color }}
            >
              {index === 0 && <Icon className="h-3.5 w-3.5" aria-hidden />}
              {label}
            </div>
          ))}
        </div>

        <h1 className="text-xl font-black leading-tight tracking-tight text-foreground">{event.title}</h1>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
            <Calendar className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-5">Fecha</p>
              <p className="text-sm font-bold text-foreground">{format(eventDate, "EEE d MMMM", { locale: es })}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-5">Horario</p>
              <p className="text-sm font-bold text-foreground">
                {formatEventTime(toEventDateTimeISO(event.date, event.time))}
                {event.time_end ? ` a ${formatEventTime(toEventDateTimeISO(event.date, event.time_end))}` : ""} hs
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-5">Lugar</p>
              <p className="text-sm font-bold text-foreground">{event.location.name}</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-ink-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
          <span>{event.location.address}</span>
        </div>

        {/* Etapa 7b: mapa solo si el lugar tiene coordenadas — sin ellas no
            tiene sentido mostrar un mapa. Description/hours ya vienen en
            event.location (Etapa 7b, LocationRead anidado en EventRead),
            no hace falta un fetch aparte. */}
        {event.location.latitude != null && event.location.longitude != null && (
          <MapPicker
            latitude={event.location.latitude}
            longitude={event.location.longitude}
            onLocationSelect={() => {}}
            readonly
            heightClassName="h-[220px]"
          />
        )}
        {(event.location.description || event.location.hours) && (
          <div className="flex flex-col gap-1 text-sm text-ink-2">
            {event.location.description && <p>{event.location.description}</p>}
            {event.location.hours && (
              <p className="flex items-start gap-1.5 text-xs text-ink-4">
                <Clock className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary" aria-hidden />
                {event.location.hours}
              </p>
            )}
          </div>
        )}

        {event.description && (
          <p className="text-sm leading-relaxed text-ink-2">{event.description}</p>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-5">
            <Ticket className="h-3.5 w-3.5 text-primary" aria-hidden />
            Entradas
          </p>
          <p className="text-sm font-bold text-foreground">{TICKET_TYPE_LABEL[event.ticket_type]}</p>
          {event.ticket_type !== "gratis" && (
            <div className="flex flex-wrap items-center gap-3">
              {event.price_at_door != null && (
                <span className="text-lg font-black text-foreground">${event.price_at_door.toLocaleString("es-AR")}</span>
              )}
              {event.price_advance != null && (
                <Badge>Anticipo ${event.price_advance.toLocaleString("es-AR")}</Badge>
              )}
            </div>
          )}
        </div>

        {(whatsappHref || instagramHref || webHref || emailHref) && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-5">Contacto del organizador</p>
            {whatsappHref && (
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
                Página web
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

        {event.available_on_site && (
          <div className="flex items-center gap-2 rounded-xl bg-surface-5 p-3 text-sm font-semibold text-ink-2">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            Habrá lugar en la puerta el día del evento
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/40 p-3 text-sm font-bold text-primary-foreground"
            title="Próximamente"
          >
            <Bell className="h-4 w-4" aria-hidden />
            Avisame antes
          </button>
          <button
            type="button"
            onClick={() => shareEvent(event)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] p-3 text-sm font-bold text-white"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            Compartir
          </button>
        </div>

        {canEdit && (
          <Link
            href={`/eventos/${event.id}/editar`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-primary p-3 text-sm font-bold text-primary"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar evento
          </Link>
        )}

        {isOwner && event.plan === "gratis" && (
          <Link
            href={`/planes?event_id=${event.id}`}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-sm font-bold text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Elegir plan
          </Link>
        )}

        {showExpiryBanner && isExpired && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" aria-hidden />
            <div className="flex flex-1 flex-col gap-2">
              <div>
                <p className="text-sm font-bold text-destructive">Tu plan destacado venció</p>
                <p className="text-xs text-ink-4">El evento volvió al plan gratuito.</p>
              </div>
              <Link
                href={`/planes?event_id=${event.id}`}
                className="w-fit rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-white"
              >
                Volver a destacar
              </Link>
            </div>
          </div>
        )}

        {showExpiryBanner && !isExpired && isExpiringSoon && (
          <div className="flex items-start gap-3 rounded-xl border border-[#EF9F2744] bg-[#2a1f0d] p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#EF9F27]" aria-hidden />
            <div className="flex flex-1 flex-col gap-2">
              <div>
                <p className="text-sm font-bold text-[#EF9F27]">
                  Tu plan {planName} vence el {format(featuredUntilDate as Date, "d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-xs text-ink-4">Renovalo para seguir apareciendo destacado.</p>
              </div>
              <Link
                href={`/planes?event_id=${event.id}`}
                className="w-fit rounded-full bg-[#EF9F27] px-3 py-1.5 text-xs font-bold text-[#0d0d0d]"
              >
                Renovar plan
              </Link>
            </div>
          </div>
        )}

        {/* organizer_subscription solo llega no-null cuando el viewer es el
            organizador o un admin (nunca en la vista pública); además solo
            interesa mientras el evento no esté aprobado y sea un plan pago
            (dest/pro) — Etapa 6b-1 */}
        {isRelevantOrganizerSubscription(event.status, event.organizer_subscription) && (
          <OrganizerSubscriptionBadge subscription={event.organizer_subscription} />
        )}

        {/* Placeholder visual: horario del lugar y descripción del venue.
            No existe todavía en el modelo Location — ver a_revisar.md */}
        <div className="flex items-start gap-2 text-xs text-ink-4">
          <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
          <span>{event.organizer.public_name} es un espacio cultural con shows en vivo.</span>
        </div>

        {/* Banner de organizador verificado con datos reales — Etapa 9a.
            Solo se muestra si el admin verificó la identidad del organizador
            (is_verified); no mostrar nada si no está verificado, para no
            generar desconfianza innecesaria. */}
        {event.organizer.is_verified && (
          <div className="flex items-start gap-3 rounded-xl border border-[#1D9E7544] bg-[#0d2a1a] p-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#5DCAA5]" aria-hidden />
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-bold text-[#5DCAA5]">Organizador verificado por seSALE</p>
              <p className="text-xs text-ink-4">Identidad confirmada. Datos personales confidenciales.</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="muted" className="gap-1">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Documento verificado
                </Badge>
                {event.organizer.phone_verified && (
                  <Badge variant="muted" className="gap-1">
                    <MessageCircle className="h-3 w-3" aria-hidden />
                    Celular verificado
                  </Badge>
                )}
                {event.organizer.email_verified && (
                  <Badge variant="muted" className="gap-1">
                    <Mail className="h-3 w-3" aria-hidden />
                    Email verificado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-ink-4">
                Miembro desde {format(parseISO(event.organizer.member_since), "MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-bold text-foreground">{event.organizer.public_name}</p>
          {event.organizer.city && <p className="text-xs text-ink-4">{event.organizer.city}</p>}
          {event.organizer.public_whatsapp && <p className="text-xs text-ink-4">{event.organizer.public_whatsapp}</p>}
        </div>

        <div className="flex flex-col gap-2 rounded-xl bg-surface-5 p-3">
          <p className="text-xs text-ink-4">
            El contenido de seSALE es moderado. Si este evento no te parece cultural o apropiado, podés reportarlo.
          </p>
          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="flex w-fit items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive"
          >
            <Flag className="h-3 w-3" aria-hidden />
            Reportar evento
          </button>
        </div>
      </div>

      {reportModalOpen && <ReportEventModal eventId={event.id} onClose={() => setReportModalOpen(false)} />}
    </div>
  );
}
