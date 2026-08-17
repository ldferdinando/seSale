"use client";

import { Search } from "lucide-react";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

import { reverseGeocode, searchAddress, type NominatimResult } from "@/lib/nominatim";
import { cn } from "@/lib/utils";

/** Fallback si no hay coordenadas ni ciudad activa: General Roca (centro del Alto Valle). */
const DEFAULT_CENTER: [number, number] = [-39.0333, -67.5833];
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";
const SEARCH_DEBOUNCE_MS = 1000;

/** Pin propio (círculo con el color primario) — evita depender de las
 * imágenes default de Leaflet, que rompen con bundlers sin config extra. */
function buildPinIcon(): L.DivIcon {
  return L.divIcon({
    className: "sesale-map-pin",
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:hsl(var(--primary));transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export interface MapPickerCoords {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (coords: MapPickerCoords) => void;
  /** Si true: solo muestra el pin, sin búsqueda ni posibilidad de mover. */
  readonly?: boolean;
  /** Default: 14 si hay coordenadas, 12 si no. */
  zoom?: number;
  /** Centro por default si no hay coordenadas (ej. la ciudad activa). */
  fallbackCenter?: [number, number];
  fallbackCityName?: string;
  /** Alto del mapa — 300px en el formulario de evento, 250px en el admin. */
  heightClassName?: string;
}

function displayNameToAddress(result: NominatimResult): string {
  const { road, house_number } = result.address ?? {};
  if (road) return house_number ? `${road} ${house_number}` : road;
  return result.display_name;
}

export function MapPicker({
  latitude,
  longitude,
  onLocationSelect,
  readonly = false,
  zoom,
  fallbackCenter,
  fallbackCityName,
  heightClassName = "h-[300px]",
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // El mapa se monta una sola vez (efecto con deps []) — dragend/click se
  // enganchan ahí también, así que closurean sobre lo que valía
  // `onLocationSelect` (y lo que cerraba a su vez, ej. la dirección
  // tipeada en ese momento) EN EL MOMENTO DEL MONTAJE, no la última
  // versión. Bug real reportado: al mover el pin, se llamaba a la
  // versión vieja de onLocationSelect, que en EventLocationField.tsx
  // caía al fallback `address ?? mapAddress` con el `mapAddress` de
  // cuando el mapa se montó (normalmente vacío) — pisando cualquier
  // dirección tipeada después. El ref siempre apunta a la versión actual.
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const hasCoords = latitude != null && longitude != null;
  const center: [number, number] = hasCoords
    ? [latitude as number, longitude as number]
    : (fallbackCenter ?? DEFAULT_CENTER);
  const initialZoom = zoom ?? (hasCoords ? 14 : 12);

  // Montaje del mapa — una sola vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom: initialZoom,
      dragging: !readonly,
      scrollWheelZoom: !readonly,
      doubleClickZoom: !readonly,
      boxZoom: !readonly,
      keyboard: !readonly,
      zoomControl: !readonly,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const marker = L.marker(center, { icon: buildPinIcon(), draggable: !readonly }).addTo(map);

    async function moveMarkerAndNotify(lat: number, lng: number) {
      marker.setLatLng([lat, lng]);
      // Las coordenadas son el dato que realmente importa (se guardan tal
      // cual) — se notifican de inmediato, sin esperar al reverse geocode.
      // El reverse geocode es solo una comodidad para autocompletar la
      // dirección: si Nominatim falla, tarda o no está disponible, el pin
      // elegido no debe perderse (antes, si el fetch fallaba, la promesa
      // rechazaba y onLocationSelect nunca se llamaba — el pin se veía
      // movido en pantalla pero el form nunca se enteraba).
      onLocationSelectRef.current({ latitude: lat, longitude: lng });
      try {
        const result = await reverseGeocode(lat, lng);
        if (result) {
          onLocationSelectRef.current({ latitude: lat, longitude: lng, address: displayNameToAddress(result) });
        }
      } catch {
        // best-effort — el pin ya quedó marcado y notificado arriba.
      }
    }

    if (!readonly) {
      marker.on("dragend", () => {
        const { lat, lng } = marker.getLatLng();
        moveMarkerAndNotify(lat, lng);
      });
      // Click en cualquier punto del mapa mueve el pin ahí — antes solo se
      // podía arrastrar el pin ya colocado (en el centro por default), lo
      // que hacía parecer que "clickear para elegir la ubicación" no hacía
      // nada. Bug real reportado: al no arrastrar el pin, el formulario
      // nunca capturaba latitude/longitude (el schema no las exige, solo la
      // dirección), así que el evento quedaba sin coordenadas — sin mapa en
      // el detalle y sin pin en el mapa del home.
      map.on("click", (e: L.LeafletMouseEvent) => {
        moveMarkerAndNotify(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Solo al montar — actualizaciones de coords se manejan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el pin/centro cuando cambian las coordenadas desde afuera
  // (ej. seleccionar un resultado de búsqueda, o el form precarga un evento).
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !hasCoords) return;
    const next: [number, number] = [latitude as number, longitude as number];
    markerRef.current.setLatLng(next);
    mapRef.current.setView(next, mapRef.current.getZoom());
  }, [latitude, longitude, hasCoords]);

  useEffect(() => {
    if (readonly || query.trim().length < 3) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchAddress(query, fallbackCityName);
        setResults(found);
        setShowResults(true);
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, readonly, fallbackCityName]);

  function handleSelectResult(result: NominatimResult) {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    setQuery(displayNameToAddress(result));
    setShowResults(false);
    setResults([]);
    onLocationSelect({ latitude: lat, longitude: lng, address: displayNameToAddress(result) });
  }

  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl border border-border", heightClassName)}>
      {!readonly && (
        <div className="absolute left-2 top-2 z-[1000] w-[calc(100%-1rem)] max-w-xs">
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-md">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-ink-4" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar dirección..."
              className="w-full bg-transparent text-sm text-ink-1 outline-none placeholder:text-ink-5"
              onFocus={() => results.length > 0 && setShowResults(true)}
            />
          </div>
          {showResults && (searching || results.length > 0) && (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-white shadow-md">
              {searching && <li className="px-3 py-2 text-xs text-ink-4">Buscando...</li>}
              {!searching &&
                results.map((result, index) => (
                  <li key={`${result.lat}-${result.lon}-${index}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="w-full px-3 py-2 text-left text-xs text-ink-2 hover:bg-surface-5"
                    >
                      {result.display_name}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
