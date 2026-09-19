import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FlyerUpload } from "@/features/events/components/FlyerUpload";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";

describe("FlyerUpload", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
  });

  it("renders a single upload zone when canUpload is true", () => {
    render(<FlyerUpload eventId={EVENT_ID} flyerUrl={null} canUpload onChange={vi.fn()} />);

    expect(screen.getByTestId("flyer-upload")).toBeInTheDocument();
    expect(screen.getByText("Flyer del evento")).toBeInTheDocument();
    expect(screen.getAllByTestId("media-drop-zone")).toHaveLength(1);
    expect(screen.getByText(/1080×1350px \(proporción 4:5/i)).toBeInTheDocument();
  });

  it("shows the current preview with Cambiar/Eliminar when there's already a flyer", () => {
    render(<FlyerUpload eventId={EVENT_ID} flyerUrl="https://cdn.example/flyer.jpg" canUpload onChange={vi.fn()} />);

    expect(screen.getByTestId("media-current-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("media-drop-zone")).not.toBeInTheDocument();
  });

  it("shows a readonly preview (no upload zone) when canUpload is false", () => {
    render(<FlyerUpload eventId={EVENT_ID} flyerUrl="https://cdn.example/flyer.jpg" canUpload={false} onChange={vi.fn()} />);

    expect(screen.getByTestId("flyer-upload-readonly")).toBeInTheDocument();
    expect(screen.queryByTestId("media-drop-zone")).not.toBeInTheDocument();
  });

  it("shows 'sin imagen cargada' in the readonly view when there's no flyer", () => {
    render(<FlyerUpload eventId={EVENT_ID} flyerUrl={null} canUpload={false} onChange={vi.fn()} />);

    expect(screen.getByText("Sin imagen cargada.")).toBeInTheDocument();
  });
});
