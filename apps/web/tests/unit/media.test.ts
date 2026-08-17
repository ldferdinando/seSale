import { describe, expect, it } from "vitest";

import { resolveMediaUrl } from "@/lib/media";

describe("resolveMediaUrl", () => {
  it("returns null for null/undefined", () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl(undefined)).toBeNull();
  });

  it("leaves absolute URLs untouched (Supabase Storage en producción, o cualquier storage externo)", () => {
    expect(resolveMediaUrl("https://storage.supabase.co/flyers/abc.jpg")).toBe(
      "https://storage.supabase.co/flyers/abc.jpg",
    );
    expect(resolveMediaUrl("http://localhost:8000/uploads/flyers/abc.jpg")).toBe(
      "http://localhost:8000/uploads/flyers/abc.jpg",
    );
  });

  it("resolves a relative path against NEXT_PUBLIC_API_URL (fallback local de development)", () => {
    expect(resolveMediaUrl("/uploads/flyers/11111111-1111-1111-1111-111111111111/flyer.jpg")).toBe(
      "http://localhost:8000/uploads/flyers/11111111-1111-1111-1111-111111111111/flyer.jpg",
    );
  });
});
