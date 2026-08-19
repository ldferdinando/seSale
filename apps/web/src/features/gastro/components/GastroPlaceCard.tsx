import { Bike, Calendar, CalendarCheck, Clock, Crown, MapPin, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_GASTRO_TYPE_STYLE, GASTRO_TYPE_STYLES } from "@/features/gastro/lib/gastroTypeStyles";
import { formatTodayHours } from "@/features/gastro/lib/openingHours";
import { GASTRO_TYPE_LABELS, type GastroPlace } from "@/features/gastro/types";
import { resolveMediaUrl } from "@/lib/media";

const VISIBLE_TYPE_BADGES = 3;

/** Mismo criterio visual que PlanBadge en EventCard.tsx (Etapa 8b): pro
 * (Destacado Plus) gradiente + corona, dest (Destacado) sólido + estrella,
 * gratis sin badge. */
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

interface GastroPlaceCardProps {
  place: GastroPlace;
}

export function GastroPlaceCard({ place }: GastroPlaceCardProps) {
  const style = GASTRO_TYPE_STYLES[place.gastro_types[0]] ?? DEFAULT_GASTRO_TYPE_STYLE;
  const Icon = style.icon;
  const coverUrl = resolveMediaUrl(place.cover_img_url);
  const todayHours = formatTodayHours(place.opening_hours);

  return (
    <Link href={`/lugares/${place.id}`} data-testid="gastro-place-card-link">
      <Card data-testid="gastro-place-card" className="overflow-hidden transition-colors hover:border-primary/40">
        <CardContent className="flex items-center gap-3 p-3">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#1a1a1a]"
            style={{ backgroundColor: coverUrl ? undefined : "#1a1a1a" }}
          >
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-6 w-6" style={{ color: style.color }} aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
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
              <GastroPlanBadge plan={place.plan} />
            </div>

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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
