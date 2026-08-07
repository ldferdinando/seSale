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
});
