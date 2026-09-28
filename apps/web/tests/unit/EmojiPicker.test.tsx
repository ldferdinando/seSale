import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EmojiPicker } from "@/components/EmojiPicker";
import { EMOJI_GROUPS, searchEmojiGroups } from "@/lib/emoji-catalog";

function emojisOf(query: string): string[] {
  return searchEmojiGroups(query).flatMap((g) => g.emojis.map((e) => e.emoji));
}

describe("emoji-catalog", () => {
  it("has no duplicated emojis across groups", () => {
    const all = EMOJI_GROUPS.flatMap((g) => g.emojis.map((e) => e.emoji));
    expect(new Set(all).size).toBe(all.length);
  });

  it("returns every group for an empty query", () => {
    expect(searchEmojiGroups("  ")).toEqual(EMOJI_GROUPS);
  });

  it("finds by Spanish keyword, ignoring accents and case", () => {
    expect(emojisOf("teatro")).toContain("🎭");
    expect(emojisOf("MUSEO")).toEqual(expect.arrayContaining(["🖼️", "🏛️"]));
    expect(emojisOf("peña")).toEqual(expect.arrayContaining(["🧉", "🪗"]));
    expect(emojisOf("bibli")).toContain("📚");
  });

  it("returns no groups when nothing matches", () => {
    expect(searchEmojiGroups("zzzz")).toEqual([]);
  });
});

function Harness({ onSubmit }: { onSubmit: () => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="e">Emoji</label>
      <EmojiPicker id="e" value={value} onChange={setValue} />
    </form>
  );
}

describe("EmojiPicker", () => {
  it("filters the grid with the search box and picks an emoji", async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Usar 🍕" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar emoji"), "biblioteca");

    expect(screen.queryByRole("button", { name: "Usar 🍕" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Usar 📚" }));
    expect(screen.getByLabelText("Emoji")).toHaveValue("📚");
  });

  it("shows a hint when the search has no results", async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);

    await user.type(screen.getByLabelText("Buscar emoji"), "zzzz");
    expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
  });

  it("pressing Enter in the search box does not submit the form", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Buscar emoji"), "teatro{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
