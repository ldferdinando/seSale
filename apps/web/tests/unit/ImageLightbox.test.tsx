import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImageLightbox } from "@/components/ImageLightbox";

describe("ImageLightbox", () => {
  it("renders the image", () => {
    render(<ImageLightbox src="https://example.com/flyer.jpg" alt="Flyer del evento" onClose={() => {}} />);

    const img = screen.getByAltText("Flyer del evento") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/flyer.jpg");
  });

  it("calls onClose when clicking the close button", () => {
    const onClose = vi.fn();
    render(<ImageLightbox src="https://example.com/flyer.jpg" alt="Flyer del evento" onClose={onClose} />);

    screen.getByLabelText("Cerrar").click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when clicking the backdrop", () => {
    const onClose = vi.fn();
    render(<ImageLightbox src="https://example.com/flyer.jpg" alt="Flyer del evento" onClose={onClose} />);

    screen.getByRole("dialog").click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when clicking the image itself", () => {
    const onClose = vi.fn();
    render(<ImageLightbox src="https://example.com/flyer.jpg" alt="Flyer del evento" onClose={onClose} />);

    screen.getByAltText("Flyer del evento").click();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(<ImageLightbox src="https://example.com/flyer.jpg" alt="Flyer del evento" onClose={onClose} />);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
