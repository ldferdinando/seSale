"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Building2,
  Calendar,
  Clock,
  Globe,
  Instagram,
  LayoutGrid,
  Mail,
  MapPin,
  MapPinned,
  Moon,
  Pencil,
  Sun,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateEvent } from "@/features/events/hooks/useCreateEvent";
import { PUBLISH_PLAN_OPTIONS, type PublishPlan } from "@/features/events/lib/publishPlans";
import { EVENT_CATEGORIES, TICKET_TYPE_OPTIONS, type Event, type EventCreateInput } from "@/features/events/types";
import { ApiError } from "@/lib/api-client";

interface SummaryRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function SummaryRow({ icon: Icon, label, value }: SummaryRowProps) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" aria-hidden />
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">{label}</span>
        <span className="break-words text-foreground">{value}</span>
      </div>
    </div>
  );
}

function formatPrice(value: number | undefined): string {
  if (value === undefined) return "";
  return new Intl.NumberFormat("es-AR").format(value);
}

interface EventSummaryViewProps {
  payload: EventCreateInput;
  plan: PublishPlan;
  onBack: () => void;
  onPublished: (event: Event) => void;
}

export function EventSummaryView({ payload, plan, onBack, onPublished }: EventSummaryViewProps) {
  const createEvent = useCreateEvent();

  const categoryLabel = EVENT_CATEGORIES.find((c) => c.value === payload.category)?.label ?? payload.category;
  const ticketTypeLabel = TICKET_TYPE_OPTIONS.find((t) => t.value === payload.ticket_type)?.label ?? payload.ticket_type;
  const planOption = PUBLISH_PLAN_OPTIONS.find((p) => p.value === plan);
  const eventDate = parseISO(payload.date);

  async function handlePublish() {
    try {
      const event = await createEvent.mutateAsync(payload);
      onPublished(event);
    } catch {
      // el error se muestra abajo, ver createEvent.isError
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-4">Revisá que todo esté bien antes de publicar tu evento.</p>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4">
          <div>
            <h2 className="text-lg font-black leading-tight text-foreground">{payload.title}</h2>
            {payload.description && <p className="mt-1 text-sm text-ink-3">{payload.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryRow icon={LayoutGrid} label="Categoría" value={categoryLabel} />
            <SummaryRow
              icon={payload.moment === "diurno" ? Sun : Moon}
              label="Momento"
              value={payload.moment === "diurno" ? "Diurno" : "Nocturno"}
            />
            <SummaryRow icon={Calendar} label="Fecha" value={format(eventDate, "d 'de' MMMM yyyy", { locale: es })} />
            <SummaryRow
              icon={Clock}
              label="Horario"
              value={payload.time_end ? `${payload.time} a ${payload.time_end} hs` : `${payload.time} hs`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <SummaryRow icon={Building2} label="Lugar" value={payload.location_name} />
            <SummaryRow icon={MapPin} label="Dirección" value={payload.location_address} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <SummaryRow icon={Ticket} label="Tipo de entrada" value={ticketTypeLabel} />
            {payload.ticket_type !== "gratis" && (
              <div className="flex flex-wrap gap-4 pl-6 text-xs text-ink-4">
                {payload.price_at_door !== undefined && <span>Puerta: ${formatPrice(payload.price_at_door)}</span>}
                {payload.price_advance !== undefined && <span>Anticipo: ${formatPrice(payload.price_advance)}</span>}
              </div>
            )}
            {payload.ticket_type !== "gratis" && (
              <div className="flex flex-col gap-1 pl-6 text-xs text-ink-4">
                {payload.contact_instagram && (
                  <span className="flex items-center gap-1.5">
                    <Instagram className="h-3 w-3" aria-hidden /> {payload.contact_instagram}
                  </span>
                )}
                {payload.contact_web && (
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3" aria-hidden /> {payload.contact_web}
                  </span>
                )}
                {payload.contact_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3 w-3" aria-hidden /> {payload.contact_email}
                  </span>
                )}
                {payload.available_on_site && (
                  <span className="flex items-center gap-1.5">
                    <MapPinned className="h-3 w-3" aria-hidden /> En el lugar / mapa el día del evento
                  </span>
                )}
              </div>
            )}
          </div>

          {planOption && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-4 px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <planOption.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                Plan {planOption.label}
              </span>
              <span className="text-sm font-bold text-primary">{planOption.price}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {createEvent.isError && (
        <p role="alert" className="text-sm text-destructive">
          {createEvent.error instanceof ApiError ? createEvent.error.message : "No pudimos publicar el evento."}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={handlePublish}
          disabled={createEvent.isPending}
          className="h-12 w-full rounded-xl text-base"
        >
          {createEvent.isPending ? "Publicando..." : "Publicar"}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Editar datos
        </Button>
      </div>
    </div>
  );
}
