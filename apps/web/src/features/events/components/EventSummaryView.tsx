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
  Pencil,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventPlanChooser } from "@/features/events/components/EventPlanChooser";
import { useCategoryCatalog } from "@/features/events/hooks/useCategoryCatalog";
import { TICKET_TYPE_OPTIONS, type Event, type EventCreateInput } from "@/features/events/types";
import { useLocation } from "@/features/locations/hooks/useLocation";

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
  onBack: () => void;
  onPublished: (event: Event) => void;
}

export function EventSummaryView({ payload, onBack, onPublished }: EventSummaryViewProps) {
  const { data: pickedLocation } = useLocation(payload.location_id);
  const { categories } = useCategoryCatalog();
  const locationName = payload.location_id ? (pickedLocation?.name ?? "...") : (payload.location_data?.name || payload.location_data?.address || "");
  const locationAddress = payload.location_id ? (pickedLocation?.address ?? "...") : (payload.location_data?.address ?? "");

  const categoryLabels = payload.categories
    .map((value) => categories.find((c) => c.key === value)?.name ?? value)
    .join(", ");
  const ticketTypeLabel = TICKET_TYPE_OPTIONS.find((t) => t.value === payload.ticket_type)?.label ?? payload.ticket_type;
  const eventDate = parseISO(payload.date);

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
            <SummaryRow icon={LayoutGrid} label="Categorías" value={categoryLabels} />
            <SummaryRow icon={Calendar} label="Fecha" value={format(eventDate, "d 'de' MMMM yyyy", { locale: es })} />
            <SummaryRow
              icon={Clock}
              label="Horario"
              value={payload.time_end ? `${payload.time} a ${payload.time_end} hs` : `${payload.time} hs`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <SummaryRow icon={Building2} label="Lugar" value={locationName} />
            <SummaryRow icon={MapPin} label="Dirección" value={locationAddress} />
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

        </CardContent>
      </Card>

      <EventPlanChooser payload={payload} onPublished={onPublished} />

      <Button type="button" variant="ghost" onClick={onBack} className="flex items-center gap-2 self-start">
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Editar datos
      </Button>
    </div>
  );
}
