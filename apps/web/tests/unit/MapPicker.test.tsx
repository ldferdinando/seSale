import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MapPicker } from "@/components/MapPicker";

describe("MapPicker", () => {
  it("renders without errors with no coordinates", () => {
    const { container } = render(<MapPicker latitude={null} longitude={null} onLocationSelect={() => {}} />);

    expect(container.querySelector(".leaflet-container")).not.toBeNull();
  });

  it("renders without errors with coordinates", () => {
    const { container } = render(
      <MapPicker latitude={-39.03} longitude={-67.58} onLocationSelect={() => {}} />,
    );

    expect(container.querySelector(".leaflet-container")).not.toBeNull();
  });

  it("shows the search input when not readonly", () => {
    render(<MapPicker latitude={null} longitude={null} onLocationSelect={() => {}} />);

    expect(screen.getByPlaceholderText("Buscar dirección...")).toBeInTheDocument();
  });

  it("readonly does not show the search input", () => {
    render(<MapPicker latitude={-39.03} longitude={-67.58} onLocationSelect={() => {}} readonly />);

    expect(screen.queryByPlaceholderText("Buscar dirección...")).not.toBeInTheDocument();
  });
});
