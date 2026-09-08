"use client";

import { Crosshair } from "lucide-react";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { format, toZonedTime } from "date-fns-tz";

import { requestUserLocation } from "@/lib/city-detection";
import { ARGENTINA_TZ, toEventDateTimeISO } from "@/lib/date-helpers";
import type { City } from "@/features/auth/types";
import type { Event, EventPlan } from "@/features/events/types";

/** Etapa 8c — mapa del home con un pin por evento visible en el listado
 * actual (mismos filtros que GET /api/events). Componente nuevo: a
 * diferencia de MapPicker.tsx (un único marker, interactivo), este renderiza
 * varios pines de solo lectura — no se reutiliza MapPicker acá. */

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const NEARBY_ZOOM = 14;

const PIN_STYLE: Record<EventPlan, { color: string; width: number; height: number }> = {
  pro: { color: "#E91E8C", width: 28, height: 42 },
  dest: { color: "#E91E8C99", width: 22, height: 33 },
  gratis: { color: "#555555", width: 18, height: 27 },
};

const PLAN_LEGEND: { plan: EventPlan; label: string }[] = [
  { plan: "pro", label: "Destacado Plus" },
  { plan: "dest", label: "Destacado" },
  { plan: "gratis", label: "Gratuito" },
];

/** Pin clásico de mapa (teardrop) como DivIcon + SVG. La punta inferior
 * (iconAnchor = [width/2, height]) cae exactamente sobre las coordenadas
 * del evento; el popup se ancla arriba de la cabeza del pin. */
function createPinIcon(color: string, width: number, height: number): L.DivIcon {
  return L.divIcon({
    html: `<svg width="${width}" height="${height}" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="#0d0d0d" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="white" opacity="0.9"/>
    </svg>`,
    className: "",
    iconSize: [width, height],
    iconAnchor: [width / 2, height],
    popupAnchor: [0, -height],
  });
}

function formatEventDateTimeShort(date: string, time: string): string {
  const iso = toEventDateTimeISO(date, time);
  return format(toZonedTime(new Date(iso), ARGENTINA_TZ), "dd/MM HH:mm", { timeZone: ARGENTINA_TZ });
}

function buildPopupHtml(event: Event): string {
  const dateTime = formatEventDateTimeShort(event.date, event.time);
  return `
    <div class="sesale-map-popup">
      <p class="sesale-map-popup-title">${escapeHtml(event.title)}</p>
      <p class="sesale-map-popup-meta">${escapeHtml(dateTime)}</p>
      <p class="sesale-map-popup-meta">${escapeHtml(event.location.name)}</p>
      <button type="button" class="sesale-map-popup-link" data-event-id="${event.id}">Ver evento</button>
    </div>
  `;
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

export interface EventsMapProps {
  events: Event[];
  activeCity: City;
  onEventClick: (eventId: string) => void;
}

export function EventsMap({ events, activeCity, onEventClick }: EventsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const onEventClickRef = useRef(onEventClick);
  onEventClickRef.current = onEventClick;

  const hasCityCoords = activeCity.latitude != null && activeCity.longitude != null;
  const cityCenter: [number, number] = hasCityCoords
    ? [activeCity.latitude as number, activeCity.longitude as number]
    : [-39.0333, -67.5833];

  // Montaje del mapa — una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: cityCenter, zoom: 13 });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    map.on("popupopen", (e) => {
      const popupNode = e.popup.getElement();
      const button = popupNode?.querySelector<HTMLButtonElement>(".sesale-map-popup-link");
      const eventId = button?.dataset.eventId;
      if (button && eventId) {
        button.addEventListener("click", () => onEventClickRef.current(eventId));
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // Solo al montar — recentrado por ciudad y pines se manejan en efectos aparte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentra cuando cambia la ciudad activa.
  useEffect(() => {
    if (!mapRef.current || !hasCityCoords) return;
    mapRef.current.setView(cityCenter, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCity.id]);

  // Redibuja los pines cuando cambia la lista de eventos.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    for (const event of events) {
      const { latitude, longitude } = event.location;
      if (latitude == null || longitude == null) continue;

      const { color, width, height } = PIN_STYLE[event.plan] ?? PIN_STYLE.gratis;
      const marker = L.marker([latitude, longitude], { icon: createPinIcon(color, width, height) })
        .bindPopup(buildPopupHtml(event), { maxWidth: 200, className: "sesale-map-popup-wrapper" })
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [events]);

  async function handleNearMeClick() {
    const coords = await requestUserLocation();
    if (!coords || !mapRef.current) return;
    mapRef.current.setView([coords.latitude, coords.longitude], NEARBY_ZOOM);
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <button
        type="button"
        onClick={handleNearMeClick}
        className="absolute right-2 top-2 z-[1000] flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink-1 shadow-md"
      >
        <Crosshair className="h-3.5 w-3.5" aria-hidden />
        Cerca mío
      </button>

      <div className="absolute bottom-2 left-2 z-[1000] flex flex-col gap-1 rounded-xl bg-[#1a1a1acc] px-2.5 py-2 text-[10px] text-white">
        {PLAN_LEGEND.map(({ plan, label }) => (
          <div key={plan} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PIN_STYLE[plan].color }}
              aria-hidden
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
