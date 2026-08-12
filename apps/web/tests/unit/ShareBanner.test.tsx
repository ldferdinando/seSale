import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareBanner } from "@/features/events/components/ShareBanner";

describe("ShareBanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the Web Share API with the app origin (no /eventos/...) when available", () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });

    render(<ShareBanner />);
    screen.getByText("Compartir seSALE").click();

    expect(shareMock).toHaveBeenCalledTimes(1);
    const { url } = shareMock.mock.calls[0][0];
    expect(url).toBe(window.location.origin);
    expect(url).not.toContain("/eventos/");
  });

  it("falls back to wa.me with the app origin when Web Share API is not available", () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    render(<ShareBanner />);
    screen.getByText("Compartir seSALE").click();

    expect(openMock).toHaveBeenCalledTimes(1);
    const calledUrl = decodeURIComponent(openMock.mock.calls[0][0]);
    expect(calledUrl).toContain("https://wa.me/?text=");
    expect(calledUrl).toContain(window.location.origin);
    expect(calledUrl).not.toContain("/eventos/");
  });
});
