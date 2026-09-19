import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

import { EventCard } from "@/features/events/components/EventCard";
import { makeEvent } from "./mocks/handlers";

// Etapa 12a: EventCard usa useCategoryCatalog() (TanStack Query) para el
// label de categoría — necesita un QueryClientProvider en el árbol, aunque
// el hook ya devuelve el fallback hardcodeado de forma síncrona mientras la
// query real está en vuelo (ver useCategoryCatalog.ts).
function renderCard(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("EventCard", () => {
  it("renders title and location", () => {
    const event = makeEvent({ title: "Feria de Artesanos" });

    renderCard(<EventCard event={event} />);

    expect(screen.getByText("Feria de Artesanos")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
  });

  // Etapa 10b-1: seSALE.html elimina la etiqueta de texto "Destacado"/
  // "Destacado Plus" — el plan pago se distingue solo por fondo/borde/
  // miniatura, nunca por texto en la card pública.
  it("does not render any plan text badge, for any plan", () => {
    renderCard(<EventCard event={makeEvent({ plan: "gratis" })} />);
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();

    renderCard(<EventCard event={makeEvent({ plan: "dest" })} />);
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();

    renderCard(<EventCard event={makeEvent({ plan: "pro" })} />);
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
  });

  it("renders the category label above the title, in text form", () => {
    const event = makeEvent({ categories: ["musica", "recital"] });

    renderCard(<EventCard event={event} />);

    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
  });

  it("plan='gratis' has no accent border nor thumbnail", () => {
    const event = makeEvent({ plan: "gratis" });

    renderCard(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).not.toContain("border-l-[6px]");
    expect(card.className).not.toContain("border-l-[3px]");
    expect(card.className).not.toContain("linear-gradient");
  });

  // Etapa "Ajustes de diseño reportados" — .evi en seSALE_v2.html no tiene
  // recuadro propio (ni fondo ni borde) para el plan gratis, a diferencia
  // del border/bg que trae el componente `Card` por default.
  it("plan='gratis' has no card box (transparent border/background)", () => {
    const event = makeEvent({ plan: "gratis" });

    renderCard(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("border-transparent");
    expect(card.className).toContain("bg-transparent");
  });

  it("plan='dest' has the gradient background and the 1.5px accent border", () => {
    const event = makeEvent({ plan: "dest" });

    renderCard(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("border-[1.5px]");
    expect(card.className).toContain("linear-gradient(135deg,#D4D94A26,#D4D94A0d)");
  });

  // Etapa "Diseño v3" — Destacado Plus pasa a ser una card de imagen
  // completa 4:5 (el flyer de fondo) en vez de la fila con miniatura 44×44
  // que tenía antes (flyer dual desktop/mobile, deprecado).
  it("plan='pro' with flyer_url shows the flyer as a full-bleed background image, 4:5, pink border", () => {
    const event = makeEvent({ plan: "pro", flyer_url: "/uploads/flyers/1/flyer.jpg" });

    const { container } = renderCard(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("aspect-[1080/1350]");
    expect(card.className).toContain("border-brand-pink");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("flyer.jpg"));
    expect(img?.className).toContain("absolute");
  });

  it("plan='pro' without a flyer shows the placeholder (no <img>), still in the 4:5 card", () => {
    const event = makeEvent({ plan: "pro", flyer_url: null });

    const { container } = renderCard(<EventCard event={event} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("aspect-[1080/1350]");
  });

  it("plan='pro' shows the event data (date, name, hour/venue) in the translucent panel", () => {
    const event = makeEvent({
      plan: "pro",
      title: "Show con flyer",
      flyer_url: "/uploads/flyers/1/flyer.jpg",
      date: "2099-01-01",
      date_end: "2099-01-01",
      time: "21:00:00",
    });

    renderCard(<EventCard event={event} />);

    expect(screen.getByText("Show con flyer")).toBeInTheDocument();
    expect(screen.getByTestId("event-card-hour")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
  });

  // Etapa "Diseño v3": seSALE_v3.html elimina el ícono de categoría junto a
  // la fecha para gratis/dest (ya no existe `.eico` en ningún lado) — el
  // nivel/categoría solo se distingue por el texto de `.etipo`, sin ícono ni
  // placeholder de imagen en la fila.
  // Las únicas svg que quedan en la fila son las de reloj/ubicación (Clock/
  // MapPin) junto a la hora y el lugar — ya no hay un ícono de categoría.
  it("plan='gratis' without flyer shows no icon nor image, only the text category label", () => {
    const event = makeEvent({ plan: "gratis", flyer_url: null, categories: ["musica"] });

    const { container } = renderCard(<EventCard event={event} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
  });

  it("plan='dest' without flyer shows no icon nor image, only the text category label", () => {
    const event = makeEvent({ plan: "dest", flyer_url: null, categories: ["musica"] });

    const { container } = renderCard(<EventCard event={event} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
  });

  // Etapa 10a: EventCard antes no mostraba ninguna hora.
  // Etapa 10c: ahora muestra el rango completo (formatEventDateRange), no
  // solo la hora de inicio — makeEvent() por default tiene date === date_end.
  it("shows the start time in 24hs format, converted to hora argentina", () => {
    const event = makeEvent({ date: "2099-01-01", date_end: "2099-01-01", time: "21:00:00" });

    renderCard(<EventCard event={event} />);

    // 21:00 UTC -3h = 18:00 hora Argentina
    expect(screen.getByTestId("event-card").textContent).toContain("18:00");
  });

  // Etapa "Cambios de diseño TIPO B v2.2" (punto 9): la hora se muestra
  // destacada (negrita + color principal), separada del nombre del lugar
  // — antes ambos heredaban el mismo `text-ink-4` del <p> padre. Sin
  // parseo de string: hora y lugar ya son campos estructurados distintos
  // (event.time/location.name), no un texto combinado tipo "21:30 · Bar".
  it("shows the hour in bold and text-primary, separate from the venue name", () => {
    const event = makeEvent({
      date: "2099-01-01",
      date_end: "2099-01-01",
      time: "21:00:00",
      time_end: "23:00:00",
    });

    renderCard(<EventCard event={event} />);

    const hourEl = screen.getByTestId("event-card-hour");
    expect(hourEl.textContent).toContain("18:00 – 20:00");
    expect(hourEl.className).toContain("font-bold");
    expect(hourEl.className).toContain("text-primary");

    const venueText = screen.getByText("El Tinglado Bar");
    expect(venueText.className).not.toContain("font-bold");
  });

  // Etapa 10c: date_end en la card.
  it("with date === date_end, shows only the hour range (no date, no +1)", () => {
    const event = makeEvent({
      date: "2099-01-01",
      date_end: "2099-01-01",
      time: "21:00:00",
      time_end: "23:00:00",
    });

    renderCard(<EventCard event={event} />);

    // 21:00/23:00 UTC -3h = 18:00/20:00 hora Argentina
    expect(screen.getByTestId("event-card").textContent).toContain("18:00 – 20:00 hs");
    expect(screen.queryByText(/\+1/)).not.toBeInTheDocument();
  });

  it("with date_end = date + 1 day, shows the +1 suffix in a smaller, secondary span", () => {
    const event = makeEvent({
      date: "2099-01-01",
      date_end: "2099-01-02",
      time: "22:00:00",
      time_end: "06:00:00",
    });

    renderCard(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.textContent).toContain("19:00 – 03:00");
    const suffix = card.querySelector(".text-\\[10px\\]");
    expect(suffix).toBeInTheDocument();
    expect(suffix?.textContent).toContain("+1");
  });

  it("with date_end > date + 1 day, shows the range with short dates", () => {
    const event = makeEvent({
      date: "2099-01-01",
      date_end: "2099-01-03",
      time: "23:00:00",
      time_end: "05:00:00",
    });

    renderCard(<EventCard event={event} />);

    expect(screen.getByTestId("event-card").textContent).toContain("20:00 1/1 – 02:00 3/1 hs");
  });

  // Etapa 10b-2: eventos dados de baja por el organizador — solo llegan a
  // esta card vía /mis-eventos (el listado público ya los filtra).
  it("shows a faded card and a badge when is_active is false", () => {
    const event = makeEvent({ is_active: false });

    renderCard(<EventCard event={event} />);

    expect(screen.getByTestId("event-inactive-badge")).toBeInTheDocument();
    expect(screen.getByTestId("event-card").className).toContain("opacity-50");
  });

  it("does not show the inactive badge when is_active is true", () => {
    const event = makeEvent({ is_active: true });

    renderCard(<EventCard event={event} />);

    expect(screen.queryByTestId("event-inactive-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("event-card").className).not.toContain("opacity-50");
  });
});
