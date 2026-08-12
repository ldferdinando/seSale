"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  Building2,
  Calendar,
  Clock,
  Flag,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Instagram as InstagramIcon,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from "@/features/events/lib/categoryStyles";
import { ReportEventModal } from "@/features/events/components/ReportEventModal";
import { EVENT_CATEGORIES } from "@/features/events/types";
import type { EventDetail } from "@/features/events/types";
import { formatEventTime, toEventDateTimeISO } from "@/lib/date-helpers";

interface EventDetailViewProps {
  event: EventDetail;
}

const TICKET_TYPE_LABEL: Record<EventDetail["ticket_type"], string> = {
  gratis: "Entrada gratuita",
  pago: "Entrada paga",
  anticipo: "Con anticipo",
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

  return (
    <div className="flex flex-col gap-5">
      <div
        className="flex h-40 items-center justify-center rounded-2xl"
        style={{ background: event.flyer_url ? undefined : `linear-gradient(135deg, ${style.color}22, ${style.color}44)` }}
      >
        {event.flyer_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.flyer_url} alt={event.title} className="h-full w-full rounded-2xl object-cover" />
        ) : (
          <Icon className="h-14 w-14" style={{ color: style.color }} aria-hidden />
        )}
      </div>

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
            href="/planes"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary p-3 text-sm font-bold text-primary-foreground"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Elegir plan
          </Link>
        )}

        {/* Placeholder visual: horario del lugar y descripción del venue.
            No existe todavía en el modelo Location — ver a_revisar.md */}
        <div className="flex items-start gap-2 text-xs text-ink-4">
          <Building2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
          <span>{event.organizer.public_name} es un espacio cultural con shows en vivo.</span>
        </div>

        {/* Placeholder visual: banner de organizador verificado.
            Requiere exponer is_verified/phone_verified/email_verified públicamente — ver a_revisar.md */}
        <div className="flex items-start gap-3 rounded-xl border border-[#1D9E7544] bg-[#0d2a1a] p-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#5DCAA5]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[#5DCAA5]">Organizador verificado por seSALE</p>
            <p className="text-xs text-ink-4">Identidad confirmada. Datos personales confidenciales.</p>
          </div>
        </div>

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
