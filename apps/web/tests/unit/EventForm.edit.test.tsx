import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventForm } from "@/features/events/components/EventForm";
import type { EventFormValues } from "@/features/events/schemas/event-schema";

const initialValues: Partial<EventFormValues> = {
  title: "Show original",
  description: "Descripción original",
  date: "2099-01-01",
  time: "21:00",
  time_end: "23:30",
  categories: ["musica"],
  location_name: "El Tinglado Bar",
  location_address: "Av. Roca 1240",
  ticket_type: "gratis",
  price_at_door: "",
  price_advance: "",
  available_on_site: true,
  contact_instagram: "",
  contact_web: "",
  contact_email: "",
};

function renderEditForm(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EventForm mode="edit" eventId="11111111-1111-1111-1111-111111111111" initialValues={initialValues} onSuccess={onSuccess} />
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("EventForm — modo edición", () => {
  it("precarga los campos con los valores existentes del evento", () => {
    renderEditForm();

    expect(screen.getByLabelText(/Nombre del evento/)).toHaveValue("Show original");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Descripción original");
    expect(screen.getByRole("button", { name: "1 de enero 2099" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hora inicio — hora")).toHaveTextContent("21");
    expect(screen.getByLabelText("Hora inicio — minutos")).toHaveTextContent("00");
    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("23");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("30");
    expect(screen.getByLabelText(/Nombre del lugar/)).toHaveValue("El Tinglado Bar");
    expect(screen.getByLabelText(/Dirección/)).toHaveValue("Av. Roca 1240");
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
  });

  it("llama a onSuccess con el evento actualizado tras guardar", async () => {
    const user = userEvent.setup();
    const onSuccess = renderEditForm();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
