import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

import { ActiveCityProvider } from "@/features/cities/context/ActiveCityContext";

/**
 * Render helper compartido por los tests que consumen `useActiveCity()`
 * (Navbar, EventForm, Home) — envuelve con `QueryClientProvider` (para
 * `useCities`) y `ActiveCityProvider`. El mock global de `GET /api/cities`
 * (`tests/unit/mocks/handlers.ts`) alcanza para que la detección resuelva
 * sin GPS real (jsdom no implementa `navigator.geolocation`).
 */
export function renderWithActiveCity(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveCityProvider>{ui}</ActiveCityProvider>
    </QueryClientProvider>,
  );
}
