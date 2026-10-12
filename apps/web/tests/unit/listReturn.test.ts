import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  armListReturn,
  consumeListReturn,
  markListReturning,
  readListReturn,
  restoreScrollPosition,
  saveListReturn,
  setLastNavigationWasTraverseForTests,
} from "@/features/events/lib/listReturn";

describe("listReturn snapshot", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("saves and reads the snapshot", () => {
    saveListReturn("/", 1200, { filters: { moment: "nocturno" } });
    expect(readListReturn()).toEqual({ path: "/", scrollY: 1200, state: { filters: { moment: "nocturno" } } });
  });

  it("only restores when a return to that same path was marked", () => {
    saveListReturn("/categorias/musica", 800, {});
    expect(consumeListReturn("/categorias/musica")).toBeNull();

    markListReturning("/categorias/musica");
    expect(consumeListReturn("/categorias/musica")).toEqual({ path: "/categorias/musica", scrollY: 800, state: {} });
  });

  it("consumes the mark once (a later plain visit does not restore)", () => {
    saveListReturn("/", 500, {});
    markListReturning("/");
    expect(consumeListReturn("/")).not.toBeNull();
    expect(consumeListReturn("/")).toBeNull();
  });

  it("does not restore a snapshot from another list", () => {
    saveListReturn("/categorias/musica", 500, {});
    markListReturning("/");
    expect(consumeListReturn("/")).toBeNull();
  });

  it("restores an armed return only when the list was reached by history traversal (browser back)", () => {
    saveListReturn("/", 700, {});

    armListReturn("/");
    setLastNavigationWasTraverseForTests(false);
    expect(consumeListReturn("/")).toBeNull();

    armListReturn("/");
    setLastNavigationWasTraverseForTests(true);
    expect(consumeListReturn("/")?.scrollY).toBe(700);
    // Una sola vez: la marca armada se consumió.
    setLastNavigationWasTraverseForTests(true);
    expect(consumeListReturn("/")).toBeNull();
  });

  it("ignores corrupt storage", () => {
    window.sessionStorage.setItem("sesale:list-return", "{nope");
    expect(readListReturn()).toBeNull();
  });
});

describe("restoreScrollPosition", () => {
  let scrollHeight = 0;
  const scrollTo = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    scrollHeight = 500;
    scrollTo.mockReset();
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => scrollHeight });
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(document.documentElement, "scrollHeight");
  });

  it("waits for the content to be tall enough, then scrolls to the saved position", () => {
    restoreScrollPosition(2000);
    vi.advanceTimersByTime(200);
    expect(scrollTo).not.toHaveBeenCalled();

    // Llegaron los eventos: la página ahora alcanza la posición guardada.
    scrollHeight = 4000;
    vi.advanceTimersByTime(50);
    expect(scrollTo).toHaveBeenCalledWith({ top: 2000, behavior: "instant" });
  });

  it("stops when the user scrolls by themselves", () => {
    restoreScrollPosition(2000);
    window.dispatchEvent(new Event("wheel"));
    scrollHeight = 4000;
    vi.advanceTimersByTime(500);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("falls back to the max reachable position after the timeout", () => {
    restoreScrollPosition(2000);
    vi.advanceTimersByTime(5000);
    // scrollHeight (500) < innerHeight de jsdom (768): lo máximo alcanzable es 0.
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
  });
});
