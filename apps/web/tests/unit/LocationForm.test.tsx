import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { LocationForm } from "@/features/admin/components/LocationForm";
import type { AdminLocation } from "@/features/locations/types";
import { makeAdminLocation } from "./mocks/handlers";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

function renderForm(location?: AdminLocation) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LocationForm location={location} onSaved={onSaved} onCancel={vi.fn()} />
    </QueryClientProvider>,
  );
  return { onSaved };
}

function section(testId: string) {
  return screen.getByTestId(testId);
}

describe("LocationForm (panel unificado de Lugares)", () => {
  it("shows base and contact fields without any type, with type-specific sections closed", async () => {
    renderForm();

    for (const label of ["Nombre *", "Dirección *", "WhatsApp", "Instagram", "Sitio web", "Email", "Facebook", "Teléfono"]) {
      expect(screen.getByLabelText(label)).toBeEnabled();
    }
    await screen.findByRole("checkbox", { name: "Bares" });
    expect(section("loc-section-hours")).toHaveAttribute("data-open", "false");
    expect(section("loc-section-gastro")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("loc-day-toggle-lunes")).toBeDisabled();
    expect(screen.getByLabelText("Delivery")).toBeDisabled();
  });

  it("groups types under Gastronomía and Espacios", async () => {
    renderForm();

    expect(await screen.findByTestId("loc-types-gastro")).toHaveTextContent("Bares");
    expect(screen.getByTestId("loc-types-espacios")).toHaveTextContent("Clubes");
  });

  it("a Gastronomía type reveals hours and the gastro section", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole("checkbox", { name: "Bares" }));

    expect(section("loc-section-hours")).toHaveAttribute("data-open", "true");
    expect(section("loc-section-gastro")).toHaveAttribute("data-open", "true");
    expect(screen.getByLabelText("Delivery")).toBeEnabled();
    expect(screen.getByLabelText("Acepta reservas")).toBeEnabled();
  });

  it("an Espacios type reveals only the (optional) hours", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole("checkbox", { name: "Clubes" }));

    expect(section("loc-section-hours")).toHaveAttribute("data-open", "true");
    expect(section("loc-section-gastro")).toHaveAttribute("data-open", "false");
    expect(screen.getByLabelText("Delivery")).toBeDisabled();
  });

  it("closing a day via its toggle disables its time inputs", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(await screen.findByRole("checkbox", { name: "Clubes" }));

    const mondayToggle = screen.getByTestId("loc-day-toggle-lunes");
    const mondayOpen = screen.getByTestId("loc-day-open-lunes");

    expect(mondayOpen).toBeDisabled();
    await user.click(mondayToggle);
    expect(mondayOpen).toBeEnabled();
    await user.click(mondayToggle);
    expect(mondayOpen).toBeDisabled();
  });

  it("limits type selection to a maximum of 5", async () => {
    const user = userEvent.setup();
    renderForm();
    await screen.findByRole("checkbox", { name: "Bares" });

    const checkboxes = ["Cervecerías", "Restaurantes", "Parrillas", "Bares", "Cafés", "Pizzerías"].map((label) =>
      screen.getByRole("checkbox", { name: label }),
    );
    for (const checkbox of checkboxes.slice(0, 5)) {
      await user.click(checkbox);
    }
    expect(checkboxes[5]).toBeDisabled();
  });

  it("offers a type created from the admin (any grupo) as an option", async () => {
    server.use(
      http.get(`${API_URL}/api/gastro-types`, () =>
        HttpResponse.json([
          { id: "gt-bar", key: "bar", name: "Bares", emoji: null, sort_order: 4, grupo: "gastro" },
          {
            id: "gt-teatro",
            key: "teatro-independiente",
            name: "Teatro independiente",
            emoji: null,
            sort_order: 99,
            grupo: "espacios",
          },
        ]),
      ),
    );
    renderForm();

    expect(await screen.findByRole("checkbox", { name: "Teatro independiente" })).toBeInTheDocument();
  });

  it("creates a location without types, sending contact and no type-specific data", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_URL}/api/admin/locations`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeAdminLocation(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { onSaved } = renderForm();

    await user.type(screen.getByLabelText("Nombre *"), "Plaza San Martín");
    await user.click(screen.getByRole("combobox", { name: "Ciudad" }));
    await user.click(await screen.findByRole("option", { name: /General Roca/ }));
    await user.type(screen.getByLabelText("Dirección *"), "Mitre 100");
    await user.type(screen.getByLabelText("Instagram"), "plazasm");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toMatchObject({
      name: "Plaza San Martín",
      address: "Mitre 100",
      gastro_types: [],
      gastro_instagram: "plazasm",
      opening_hours: null,
      price_range: null,
      has_delivery: false,
    });
  });

  it("edits a gastro place with PUT, keeping contact, hours and gastro fields", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.put(`${API_URL}/api/admin/locations/:id`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(makeAdminLocation());
      }),
    );
    const user = userEvent.setup();
    const { onSaved } = renderForm(
      makeAdminLocation({
        gastro_types: ["bar"],
        is_gastro: true,
        has_reservations: true,
        price_range: "$$",
        gastro_whatsapp: "5492984000001",
        opening_hours: { lunes: { open: "20:00", close: "02:00" } },
      }),
    );

    expect(await screen.findByTestId("loc-section-gastro")).toHaveAttribute("data-open", "true");
    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "2984123456");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(body).toMatchObject({
      gastro_types: ["bar"],
      gastro_whatsapp: "5492984000001",
      gastro_phone: "2984123456",
      has_reservations: true,
      price_range: "$$",
      is_active: true,
      is_public: true,
    });
    expect((body as unknown as { opening_hours: Record<string, unknown> }).opening_hours.lunes).toEqual({
      open: "20:00",
      close: "02:00",
    });
  });

  it("only offers the cover upload once the saved place has a Gastronomía type", async () => {
    renderForm(makeAdminLocation({ gastro_types: ["club"], is_gastro: true }));

    expect(
      await screen.findByText("La foto de portada se sube después de guardar el lugar con un tipo de Gastronomía."),
    ).toBeInTheDocument();
  });

  // Bug reportado: al editar un lugar no se veía ninguna forma de marcarlo
  // como Destacado/Destacado Plus — el control solo vivía en la fila de la
  // lista (AdminLocationsPanel), que desaparece al abrir el formulario.
  it("shows a 'Destacado' control while editing a place with types, opening the featured modal", async () => {
    const user = userEvent.setup();
    renderForm(makeAdminLocation({ gastro_types: ["bar"], is_gastro: true, configured_plan: "gratis" }));

    const button = await screen.findByRole("button", { name: "Destacar" });
    await user.click(button);

    expect(await screen.findByRole("dialog", { name: /Destacado de/ })).toBeInTheDocument();
  });

  it("does not show the 'Destacado' control for a place without any type", async () => {
    renderForm(makeAdminLocation({ gastro_types: [], is_gastro: false }));

    await screen.findByLabelText("Nombre *");
    expect(screen.queryByRole("button", { name: "Destacar" })).not.toBeInTheDocument();
  });

  it("does not show the 'Destacado' control when creating a new place", () => {
    renderForm(undefined);

    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
  });
});
