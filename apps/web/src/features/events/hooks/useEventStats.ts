import { useQuery } from "@tanstack/react-query";

import { fetchStats } from "@/features/events/services/events-api";

export function useEventStats() {
  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
  });

  return {
    eventsCount: data?.total_events ?? 0,
    organizersCount: data?.total_organizers ?? 0,
    citiesCount: data?.total_cities ?? 0,
    isLoading,
  };
}
