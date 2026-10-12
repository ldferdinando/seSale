import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SCROLL_TO_RESULTS_DELAY_MS,
  chipFiltersChanged,
  scrollToResults,
} from "@/features/events/lib/scrollToResults";

function anchorAt(top: number) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ top }) as DOMRect;
  el.scrollIntoView = vi.fn();
  return el;
}

describe("chipFiltersChanged", () => {
  it("detects changes in date, moment, category and ticket type", () => {
    expect(chipFiltersChanged({}, { moment: "nocturno" })).toBe(true);
    expect(chipFiltersChanged({}, { category: "musica" })).toBe(true);
    expect(chipFiltersChanged({}, { ticketType: "gratis" })).toBe(true);
    expect(chipFiltersChanged({}, { dateFrom: "2026-10-09", dateTo: "2026-10-09" })).toBe(true);
    expect(chipFiltersChanged({ moment: "diurno" }, {})).toBe(true);
  });

  it("ignores search-only changes and no-op updates", () => {
    expect(chipFiltersChanged({ moment: "diurno" }, { moment: "diurno", search: "rock" })).toBe(false);
    expect(chipFiltersChanged({ category: "musica" }, { category: "musica" })).toBe(false);
  });
});

describe("scrollToResults", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("smooth-scrolls to the anchor when it is below the viewport top, after the re-render delay", () => {
    const anchor = anchorAt(900);
    scrollToResults(() => anchor);

    expect(anchor.scrollIntoView).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SCROLL_TO_RESULTS_DELAY_MS);
    expect(anchor.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("does nothing when the user is already looking at the results", () => {
    const anchor = anchorAt(-400);
    scrollToResults(() => anchor);
    vi.advanceTimersByTime(SCROLL_TO_RESULTS_DELAY_MS);
    expect(anchor.scrollIntoView).not.toHaveBeenCalled();
  });

  it("tolerates a missing anchor", () => {
    scrollToResults(() => null);
    expect(() => vi.advanceTimersByTime(SCROLL_TO_RESULTS_DELAY_MS)).not.toThrow();
  });
});

describe("scrollToResults with the sticky navbar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mountHeader(height: number) {
    const header = document.createElement("header");
    header.setAttribute("data-sticky-header", "");
    header.getBoundingClientRect = () => ({ height }) as DOMRect;
    document.body.appendChild(header);
  }

  it("leaves the results right below the navbar instead of under it", () => {
    mountHeader(190);
    const anchor = anchorAt(900);
    scrollToResults(() => anchor);
    vi.advanceTimersByTime(SCROLL_TO_RESULTS_DELAY_MS);

    expect(anchor.style.scrollMarginTop).toBe("198px");
    expect(anchor.scrollIntoView).toHaveBeenCalled();
  });

  it("treats an anchor just below the navbar as 'already at the results'", () => {
    mountHeader(190);
    const anchor = anchorAt(198);
    scrollToResults(() => anchor);
    vi.advanceTimersByTime(SCROLL_TO_RESULTS_DELAY_MS);

    expect(anchor.scrollIntoView).not.toHaveBeenCalled();
  });
});
