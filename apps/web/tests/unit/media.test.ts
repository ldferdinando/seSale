import { describe, expect, it } from "vitest";

import { isOptimizableMediaUrl, resolveMediaUrl } from "@/lib/media";

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

// P0-4 — tiene que coincidir con images.remotePatterns de next.config.js.
describe("isOptimizableMediaUrl", () => {
  it("accepts Supabase Storage public URLs", () => {
    expect(
      isOptimizableMediaUrl("https://abcd.supabase.co/storage/v1/object/public/flyers/1/1-ab12cd34.webp"),
    ).toBe(true);
  });

  it("accepts the backend's local /uploads fallback", () => {
    expect(isOptimizableMediaUrl("http://localhost:8000/uploads/flyers/1/flyer.webp")).toBe(true);
  });

  it("rejects external hosts, non-public Supabase paths, other backend paths and GIFs", () => {
    expect(isOptimizableMediaUrl("https://x.com/a.jpg")).toBe(false);
    expect(isOptimizableMediaUrl("http://abcd.supabase.co/storage/v1/object/public/flyers/a.jpg")).toBe(false);
    expect(isOptimizableMediaUrl("https://abcd.supabase.co/storage/v1/object/sign/flyers/a.jpg")).toBe(false);
    expect(isOptimizableMediaUrl("http://localhost:8000/api/events")).toBe(false);
    expect(isOptimizableMediaUrl("https://abcd.supabase.co/storage/v1/object/public/banners/1/a.GIF")).toBe(false);
  });

  it("rejects empty values, relative paths and blob: previews", () => {
    expect(isOptimizableMediaUrl(null)).toBe(false);
    expect(isOptimizableMediaUrl(undefined)).toBe(false);
    expect(isOptimizableMediaUrl("/uploads/flyers/1/flyer.jpg")).toBe(false);
    expect(isOptimizableMediaUrl("blob:http://localhost:3000/abc")).toBe(false);
  });
});
