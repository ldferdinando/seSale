import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { useCreateEvent } from "@/features/events/hooks/useCreateEvent";
import { makeEvent } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

describe("useCreateEvent", () => {
  it("invalidates my-events, events and admin-events so newly created pending events show up right away", async () => {
    server.use(
      http.post(`${API_URL}/api/events`, () => HttpResponse.json(makeEvent({ status: "pending" }), { status: 201 })),
    );

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Cache "tibio" de una visita previa al panel admin / home, como en el bug reportado.
    queryClient.setQueryData(["admin-events", {}], []);
    queryClient.setQueryData(["events", {}], []);
    queryClient.setQueryData(["my-events"], { pending: [], approved: [], rejected: [] });

    function wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useCreateEvent(), { wrapper });

    result.current.mutate({
      title: "Nuevo evento",
      date: "2099-01-01",
      time: "21:00:00",
      category: "musica",
      location_name: "Lugar",
      location_address: "Dirección",
      ticket_type: "gratis",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(["admin-events", {}])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["events", {}])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["my-events"])?.isInvalidated).toBe(true);
  });
});
