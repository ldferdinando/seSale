import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EventCard } from "@/features/events/components/EventCard";
import { makeEvent } from "./mocks/handlers";

describe("EventCard", () => {
  it("renders title and location", () => {
    const event = makeEvent({ title: "Feria de Artesanos" });

    render(<EventCard event={event} />);

    expect(screen.getByText("Feria de Artesanos")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
  });

  // Etapa 10b-1: seSALE.html elimina la etiqueta de texto "Destacado"/
  // "Destacado Plus" — el plan pago se distingue solo por fondo/borde/
  // miniatura, nunca por texto en la card pública.
  it("does not render any plan text badge, for any plan", () => {
    render(<EventCard event={makeEvent({ plan: "gratis" })} />);
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();

    render(<EventCard event={makeEvent({ plan: "dest" })} />);
    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();

    render(<EventCard event={makeEvent({ plan: "pro" })} />);
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
  });

  it("renders the category label above the title, in text form", () => {
    const event = makeEvent({ categories: ["musica", "recital"] });

    render(<EventCard event={event} />);

    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
  });

  it("plan='gratis' has no accent border nor thumbnail", () => {
    const event = makeEvent({ plan: "gratis" });

    render(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).not.toContain("border-l-[6px]");
    expect(card.className).not.toContain("border-l-[3px]");
    expect(card.className).not.toContain("linear-gradient");
  });

  it("plan='dest' has the gradient background and the 1.5px accent border", () => {
    const event = makeEvent({ plan: "dest" });

    render(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("border-[1.5px]");
    expect(card.className).toContain("linear-gradient(135deg,#E91E8C22,#E91E8C0d)");
  });

  it("plan='pro' with flyer_url shows the thumbnail image", () => {
    const event = makeEvent({ plan: "pro", flyer_url: "/uploads/flyers/1/flyer.jpg" });

    const { container } = render(<EventCard event={event} />);

    const card = screen.getByTestId("event-card");
    expect(card.className).toContain("border-l-[6px]");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", expect.stringContaining("flyer.jpg"));
  });

  it("plan='pro' without flyer_url shows an image placeholder", () => {
    const event = makeEvent({ plan: "pro", flyer_url: null });

    const { container } = render(<EventCard event={event} />);

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  // Etapa 10a: EventCard antes no mostraba ninguna hora.
  // Etapa 10c: ahora muestra el rango completo (formatEventDateRange), no
  // solo la hora de inicio — makeEvent() por default tiene date === date_end.
  it("shows the start time in 24hs format, converted to hora argentina", () => {
    const event = makeEvent({ date: "2099-01-01", date_end: "2099-01-01", time: "21:00:00" });

    render(<EventCard event={event} />);

    // 21:00 UTC -3h = 18:00 hora Argentina
    expect(screen.getByTestId("event-card").textContent).toContain("18:00");
  });

  // Etapa 10c: date_end en la card.
  it("with date === date_end, shows only the hour range (no date, no +1)", () => {
    const event = makeEvent({
      date: "2099-01-01",
      date_end: "2099-01-01",
      time: "21:00:00",
      time_end: "23:00:00",
    });

    render(<EventCard event={event} />);

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

    render(<EventCard event={event} />);

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

    render(<EventCard event={event} />);

    expect(screen.getByTestId("event-card").textContent).toContain("20:00 1/1 – 02:00 3/1 hs");
  });

  // Etapa 10b-2: eventos dados de baja por el organizador — solo llegan a
  // esta card vía /mis-eventos (el listado público ya los filtra).
  it("shows a faded card and a badge when is_active is false", () => {
    const event = makeEvent({ is_active: false });

    render(<EventCard event={event} />);

    expect(screen.getByTestId("event-inactive-badge")).toBeInTheDocument();
    expect(screen.getByTestId("event-card").className).toContain("opacity-50");
  });

  it("does not show the inactive badge when is_active is true", () => {
    const event = makeEvent({ is_active: true });

    render(<EventCard event={event} />);

    expect(screen.queryByTestId("event-inactive-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("event-card").className).not.toContain("opacity-50");
  });
});
