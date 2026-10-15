import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LocationFeaturedModal } from "@/features/admin/components/LocationFeaturedModal";
import { makeAdminLocation } from "./mocks/handlers";

function renderWithClient(location = makeAdminLocation({ is_gastro: true })) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LocationFeaturedModal location={location} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("LocationFeaturedModal", () => {
  it("does not show the banner uploader when the level is 'Ninguno' or 'Destacado'", () => {
    renderWithClient();

    expect(screen.queryByTestId("media-drop-zone")).not.toBeInTheDocument();
  });

  // Bug reportado: "no veo la imagen que subí" — el banner se podía subir
  // contra un lugar cuyo plan="pro" todavía no estaba guardado en el
  // backend (upload_location_featured_banner lo exige), así que la subida
  // fallaba en silencio. Ahora el uploader solo aparece DESPUÉS de guardar
  // el nivel "Destacado Plus" — antes se muestra un aviso en su lugar.
  it("does not show the banner uploader right after picking 'Destacado Plus', before saving", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.selectOptions(screen.getByRole("combobox", { name: "Nivel de destacado" }), "Destacado Plus");

    expect(screen.queryByText("Banner de Destacado Plus")).not.toBeInTheDocument();
    expect(screen.getByTestId("featured-banner-save-first-notice")).toBeInTheDocument();
  });

  it("shows the banner uploader after saving 'Destacado Plus', and keeps the modal open", async () => {
    const user = userEvent.setup();
    const { onClose } = renderWithClient();

    await user.selectOptions(screen.getByRole("combobox", { name: "Nivel de destacado" }), "Destacado Plus");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Banner de Destacado Plus")).toBeInTheDocument();
    expect(screen.queryByTestId("featured-banner-save-first-notice")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("prefills from/until with today and today+30 days when activating from 'Ninguno'", async () => {
    const user = userEvent.setup();
    renderWithClient();

    await user.selectOptions(screen.getByRole("combobox", { name: "Nivel de destacado" }), "Destacado");

    const today = new Date().toISOString().slice(0, 10);
    expect(screen.getByLabelText("Desde")).toHaveValue(today);
    expect(screen.getByLabelText("Hasta")).not.toHaveValue("");
    expect(screen.getByLabelText("Hasta")).not.toHaveValue(today);
  });

  it("shows the 'vencido' notice for an already expired configured plan", () => {
    const location = makeAdminLocation({
      is_gastro: true,
      plan: "gratis",
      configured_plan: "pro",
      featured_from: "2020-01-01T00:00:00Z",
      featured_until: "2020-02-01T00:00:00Z",
    });

    renderWithClient(location);

    expect(screen.getByTestId("featured-expired-notice")).toHaveTextContent("Destacado Plus");
    expect(screen.getByTestId("featured-expired-notice")).toHaveTextContent("venció el 01/02/2020");
  });

  it("closes the modal after saving", async () => {
    const user = userEvent.setup();
    const { onClose } = renderWithClient();

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
