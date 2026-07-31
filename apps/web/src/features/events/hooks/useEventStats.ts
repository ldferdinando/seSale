import { useEvents } from "@/features/events/hooks/useEvents";

/**
 * Estadísticas derivadas de /api/events (sin filtros). "Organizadores" no se
 * puede calcular todavía: EventRead no expone organizer_id — ver a_revisar.md.
 */
export function useEventStats() {
  const { data, isLoading } = useEvents({});

  const eventsCount = data?.length ?? 0;
  const citiesCount = data ? new Set(data.map((event) => event.city_id)).size : 0;

  return { eventsCount, citiesCount, isLoading };
}
