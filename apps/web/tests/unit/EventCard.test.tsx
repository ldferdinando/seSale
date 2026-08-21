import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EventCard } from "@/features/events/components/EventCard";
import { makeEvent } from "./mocks/handlers";

describe("EventCard", () => {
  it("renders title, location and plan badge", () => {
    const event = makeEvent({ title: "Feria de Artesanos", plan: "pro" });

    render(<EventCard event={event} />);

    expect(screen.getByText("Feria de Artesanos")).toBeInTheDocument();
    expect(screen.getByText("El Tinglado Bar")).toBeInTheDocument();
    expect(screen.getByText("Destacado Plus")).toBeInTheDocument();
  });

  it("renders the destacado badge for dest events", () => {
    const event = makeEvent({ plan: "dest" });

    render(<EventCard event={event} />);

    expect(screen.getByText("Destacado")).toBeInTheDocument();
  });

  it("renders no plan badge for gratis events", () => {
    const event = makeEvent({ plan: "gratis" });

    render(<EventCard event={event} />);

    expect(screen.queryByText("Destacado")).not.toBeInTheDocument();
    expect(screen.queryByText("Destacado Plus")).not.toBeInTheDocument();
    expect(screen.queryByText("Gratis")).not.toBeInTheDocument();
  });

  it("shows a badge per category, up to 2, with a +N badge for the rest", () => {
    const event = makeEvent({ categories: ["musica", "recital", "arte"] });

    render(<EventCard event={event} />);

    expect(screen.getByText("Música en vivo")).toBeInTheDocument();
    expect(screen.getByText("Recital")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  // Etapa 10a: EventCard antes no mostraba ninguna hora.
  it("shows the start time in 24hs format, converted to hora argentina", () => {
    const event = makeEvent({ date: "2099-01-01", time: "21:00:00" });

    render(<EventCard event={event} />);

    // 21:00 UTC -3h = 18:00 hora Argentina
    expect(screen.getByText("18:00 hs")).toBeInTheDocument();
  });
});
