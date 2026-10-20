import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { TodayBanner } from "@/features/events/components/TodayBanner";
import { useActiveCity } from "@/hooks/useActiveCity";

import { server } from "./mocks/server";
import { renderWithActiveCity } from "./test-utils";
import { makeEvent } from "./mocks/handlers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const GENERAL_ROCA_ID = "22222222-2222-2222-2222-222222222222";
const CIPOLLETTI_ID = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

function renderBanner() {
  return renderWithActiveCity(<TodayBanner onClick={vi.fn()} />);
}

/** Expone un botón para cambiar a Cipolletti sin pasar por el CitySelector del Navbar. */
function BannerWithCitySwitch() {
  const { setActiveCity } = useActiveCity();
  return (
    <>
      <TodayBanner onClick={vi.fn()} />
      <button
        type="button"
        onClick={() =>
          setActiveCity({
            id: CIPOLLETTI_ID,
            name: "Cipolletti",
            province: "Río Negro",
            emoji: "🌆",
            is_active: true,
            sort_order: 1,
            latitude: -38.9333,
            longitude: -68.0,
          })
        }
      >
        Cambiar a Cipolletti
      </button>
    </>
  );
}

describe("TodayBanner", () => {
  // Etapa 12b — Parte 1: el filtro "¿Qué hay hoy?" ocupa el mismo ancho que
  // los banners wide de arriba (verificado en el navegador: 608px, igual que
  // AdSlots). El <button> es `display:flex` — sin un ancho explícito se
  // encogía a su contenido (~273px). El layout real no es testeable en jsdom
  // (getBoundingClientRect siempre da 0); acá solo se fija la intención.
  it("stretches to the container width (not shrink-to-fit)", () => {
    renderBanner();

    const button = screen.getByRole("button");
    expect(button.className).toContain("w-[calc(100%-2rem)]");
  });

  // Etapa "Labels transversales + orden de filtros" (Parte 4): tercera línea
  // con la ciudad activa, calcada de `#en-loc` en seSALE.html.
  it("shows the active city as a third line", async () => {
    renderBanner();

    await waitFor(() => expect(screen.getByText("General Roca")).toBeInTheDocument());
  });

  // Bug: el conteo ("N plan(es)") no se recalculaba al cambiar de ciudad
  // porque useEvents() se llamaba sin `cityId` — devolvía eventos de todas
  // las ciudades sin importar la ciudad activa (ver a_revisar.md).
  it("recalculates the plan count for the newly selected city, without a page reload", async () => {
    server.use(
      http.get(`${API_URL}/api/events`, ({ request }) => {
        const cityId = new URL(request.url).searchParams.get("city_id");
        if (cityId === CIPOLLETTI_ID) return HttpResponse.json([]);
        if (cityId === GENERAL_ROCA_ID) return HttpResponse.json([makeEvent(), makeEvent({ id: "other-event" })]);
        // Sin city_id: reproduce el bug si alguna vez vuelve a pasar.
        return HttpResponse.json([makeEvent(), makeEvent({ id: "other-event" })]);
      }),
    );

    const user = userEvent.setup();
    renderWithActiveCity(<BannerWithCitySwitch />);

    await waitFor(() => expect(screen.getByText("2 planes")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Cambiar a Cipolletti" }));

    await waitFor(() => expect(screen.getByText("0 planes")).toBeInTheDocument());
  });
});
