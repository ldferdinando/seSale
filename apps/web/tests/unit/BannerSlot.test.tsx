import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BannerSlot } from "@/components/BannerSlot";
import type { AdSlot } from "@/features/ads/types";

function makeSlot(overrides: Partial<AdSlot> = {}): AdSlot {
  return {
    id: "slot-1",
    city_id: "city-1",
    section: "eventos",
    slot_position: 0,
    rotation_mode: "sequential",
    rotation_interval_seconds: 3,
    is_active: true,
    items: [],
    ...overrides,
  };
}

describe("BannerSlot", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the empty state when there are no items", () => {
    render(<BannerSlot slot={makeSlot({ items: [] })} />);

    expect(screen.getByTestId("banner-slot-empty")).toBeInTheDocument();
    expect(screen.getByText("Espacio publicitario disponible")).toBeInTheDocument();
  });

  it("shows the image without rotating when there is a single item", () => {
    render(
      <BannerSlot
        slot={makeSlot({
          items: [{ id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: null, display_order: 0 }],
        })}
      />,
    );

    const img = screen.getByAltText("Publicidad") as HTMLImageElement;
    expect(img.src).toBe("https://x.com/a.jpg");

    act(() => { vi.advanceTimersByTime(10_000); });
    expect((screen.getByAltText("Publicidad") as HTMLImageElement).src).toBe("https://x.com/a.jpg");
  });

  it("rotates sequentially through items in order", () => {
    render(
      <BannerSlot
        slot={makeSlot({
          rotation_mode: "sequential",
          rotation_interval_seconds: 3,
          items: [
            { id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: "a", display_order: 0 },
            { id: "b", img_url: "https://x.com/b.jpg", link_url: null, alt_text: "b", display_order: 1 },
          ],
        })}
      />,
    );

    expect(screen.getByAltText("a")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByAltText("b")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByAltText("a")).toBeInTheDocument();
  });

  it("random mode never shows the same item twice in a row", () => {
    render(
      <BannerSlot
        slot={makeSlot({
          section: "eventos-grid",
          rotation_mode: "random",
          rotation_interval_seconds: 1,
          items: [
            { id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: "a", display_order: 0 },
            { id: "b", img_url: "https://x.com/b.jpg", link_url: null, alt_text: "b", display_order: 1 },
          ],
        })}
      />,
    );

    let lastAlt = screen.getByAltText(/a|b/).getAttribute("alt");
    for (let i = 0; i < 10; i++) {
      act(() => { vi.advanceTimersByTime(1000); });
      const current = screen.getByAltText(/a|b/).getAttribute("alt");
      expect(current).not.toBe(lastAlt);
      lastAlt = current;
    }
  });

  it("wraps the image in a link when link_url is set and opens in a new tab", () => {
    render(
      <BannerSlot
        slot={makeSlot({
          items: [{ id: "a", img_url: "https://x.com/a.jpg", link_url: "https://destino.com", alt_text: "a", display_order: 0 }],
        })}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://destino.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render a link when link_url is not set", () => {
    render(
      <BannerSlot
        slot={makeSlot({
          items: [{ id: "a", img_url: "https://x.com/a.jpg", link_url: null, alt_text: "a", display_order: 0 }],
        })}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
