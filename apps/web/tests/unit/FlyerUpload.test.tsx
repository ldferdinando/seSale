import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FlyerUpload } from "@/features/events/components/FlyerUpload";

const EVENT_ID = "11111111-1111-1111-1111-111111111111";

describe("FlyerUpload", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
  });

  it("renders two independent upload zones when canUpload is true", () => {
    render(
      <FlyerUpload
        eventId={EVENT_ID}
        flyerUrlDesktop={null}
        flyerUrlMobile={null}
        canUpload
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("flyer-upload")).toBeInTheDocument();
    expect(screen.getByText("Flyer para desktop y tablet")).toBeInTheDocument();
    expect(screen.getByText("Flyer para mobile (opcional)")).toBeInTheDocument();
    // dos dropzones = dos zonas independientes
    expect(screen.getAllByTestId("media-drop-zone")).toHaveLength(2);
  });

  it("the mobile zone can stay empty (its subtitle explains the desktop fallback)", () => {
    render(
      <FlyerUpload
        eventId={EVENT_ID}
        flyerUrlDesktop="https://cdn.example/d.jpg"
        flyerUrlMobile={null}
        canUpload
        onChange={vi.fn()}
      />,
    );

    // desktop tiene preview, mobile sigue mostrando su dropzone vacío
    expect(screen.getByText(/Si no subís uno, se usa el de desktop/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("media-drop-zone")).toHaveLength(1);
  });

  it("shows a readonly preview (no upload zones) when canUpload is false", () => {
    render(
      <FlyerUpload
        eventId={EVENT_ID}
        flyerUrlDesktop="https://cdn.example/d.jpg"
        flyerUrlMobile={null}
        canUpload={false}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("flyer-upload-readonly")).toBeInTheDocument();
    expect(screen.queryByTestId("media-drop-zone")).not.toBeInTheDocument();
    expect(screen.getByText("Sin imagen cargada.")).toBeInTheDocument(); // la de mobile
  });
});
