import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { EventForm } from "@/features/events/components/EventForm";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";
const VALID_USER_ID = "11111111-1111-1111-1111-111111111111";

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventForm />
    </QueryClientProvider>,
  );
}

async function fillRequiredFieldsExceptCategory(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/ID de organizador/i), VALID_USER_ID);
  await user.type(screen.getByLabelText("Título"), "Mi evento de prueba");
  fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2099-01-01" } });
  fireEvent.change(screen.getByLabelText("Hora"), { target: { value: "21:00" } });
  await user.type(screen.getByLabelText("Lugar"), "El Tinglado Bar");
  await user.type(screen.getByLabelText("Dirección"), "Av. Roca 1240");
}

async function selectCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByLabelText("Categoría"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("EventForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all the fields from the event model", () => {
    renderWithClient();

    expect(screen.getByLabelText(/ID de organizador/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toBeInTheDocument();
    expect(screen.getByLabelText("Hora")).toBeInTheDocument();
    expect(screen.getByLabelText("Lugar")).toBeInTheDocument();
    expect(screen.getByLabelText("Dirección")).toBeInTheDocument();
    expect(screen.getByText("Tipo de entrada")).toBeInTheDocument();
    expect(screen.getByLabelText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByLabelText("Instagram")).toBeInTheDocument();
    expect(screen.getByLabelText("Web")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar evento" })).toBeInTheDocument();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    expect(await screen.findByText("El título es obligatorio")).toBeInTheDocument();
    expect(screen.getByText("La fecha es obligatoria")).toBeInTheDocument();
    expect(screen.getByText("La dirección es obligatoria")).toBeInTheDocument();
  });

  it("submits successfully and shows a confirmation message", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFieldsExceptCategory(user);
    await selectCategory(user, "Música en vivo");

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    expect(await screen.findByText(/Evento enviado/i)).toBeInTheDocument();
  });

  it("shows an error message when the API call fails", async () => {
    server.use(
      http.post(`${API_URL}/api/events`, () => HttpResponse.json({ detail: "Organizador no encontrado" }, { status: 404 })),
    );
    const user = userEvent.setup();
    renderWithClient();

    await fillRequiredFieldsExceptCategory(user);
    await selectCategory(user, "Música en vivo");

    await user.click(screen.getByRole("button", { name: "Publicar evento" }));

    await waitFor(() => expect(screen.getByText("Organizador no encontrado")).toBeInTheDocument());
  });
});
