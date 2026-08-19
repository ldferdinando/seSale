import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";

import { AdGridPool, pickPair } from "@/components/AdGridPool";
import type { AdItemPublic } from "@/features/ads/types";

function makeItem(overrides: Partial<AdItemPublic> = {}): AdItemPublic {
  return {
    id: "item-1",
    img_url: "https://x.com/a.jpg",
    link_url: null,
    alt_text: "item-1",
    display_order: 0,
    ...overrides,
  };
}

describe("pickPair", () => {
  it("returns [null, null] for an empty pool", () => {
    expect(pickPair(0)).toEqual([null, null]);
  });

  it("returns [0, null] for a pool of 1", () => {
    expect(pickPair(1)).toEqual([0, null]);
  });

  it("never returns the same index twice for a pool of 2+", () => {
    for (let length = 2; length <= 5; length++) {
      for (let i = 0; i < 50; i++) {
        const [a, b] = pickPair(length);
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a).not.toBe(b);
        expect(a).toBeLessThan(length);
        expect(b).toBeLessThan(length);
      }
    }
  });
});

describe("AdGridPool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows 2 placeholders when the pool is empty", () => {
    render(<AdGridPool items={[]} rotationIntervalSeconds={3} />);

    expect(screen.getAllByTestId("ad-grid-tile-empty")).toHaveLength(2);
    expect(screen.queryByTestId("ad-grid-tile")).not.toBeInTheDocument();
  });

  it("shows 1 item and 1 placeholder when the pool has a single item", () => {
    render(<AdGridPool items={[makeItem({ id: "a" })]} rotationIntervalSeconds={3} />);

    expect(screen.getAllByTestId("ad-grid-tile")).toHaveLength(1);
    expect(screen.getAllByTestId("ad-grid-tile-empty")).toHaveLength(1);
  });

  it("shows 2 distinct items from the pool when there are 2+", () => {
    const items = [makeItem({ id: "a", alt_text: "a" }), makeItem({ id: "b", alt_text: "b" })];
    render(<AdGridPool items={items} rotationIntervalSeconds={3} />);

    const tiles = screen.getAllByTestId("ad-grid-tile");
    expect(tiles).toHaveLength(2);
    expect(screen.queryByTestId("ad-grid-tile-empty")).not.toBeInTheDocument();

    const alts = tiles.map((tile) => tile.querySelector("img")?.alt);
    expect(alts[0]).not.toBe(alts[1]);
  });

  it("rotates the pair every rotation_interval_seconds", () => {
    const items = [
      makeItem({ id: "a", alt_text: "a" }),
      makeItem({ id: "b", alt_text: "b" }),
      makeItem({ id: "c", alt_text: "c" }),
      makeItem({ id: "d", alt_text: "d" }),
      makeItem({ id: "e", alt_text: "e" }),
    ];
    render(<AdGridPool items={items} rotationIntervalSeconds={3} />);

    const altsBefore = screen.getAllByTestId("ad-grid-tile").map((tile) => tile.querySelector("img")?.alt);

    // Avanza varios intervalos: con 5 items en el pool, la chance de que el
    // par se repita en todos los intentos es despreciable.
    let altsAfter = altsBefore;
    for (let i = 0; i < 10 && JSON.stringify(altsAfter) === JSON.stringify(altsBefore); i++) {
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      altsAfter = screen.getAllByTestId("ad-grid-tile").map((tile) => tile.querySelector("img")?.alt);
    }

    expect(altsAfter).not.toEqual(altsBefore);
  });
});
