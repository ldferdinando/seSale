import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { reverseGeocode, searchAddress } from "@/lib/nominatim";
import { server } from "./mocks/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

describe("nominatim", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("searchAddress always sends countrycodes=ar", async () => {
    const captured: { url: URL | null } = { url: null };
    server.use(
      http.get(`${NOMINATIM_URL}/search`, ({ request }) => {
        captured.url = new URL(request.url);
        return HttpResponse.json([]);
      }),
    );

    await searchAddress("Av. Roca 1240");

    expect(captured.url?.searchParams.get("countrycodes")).toBe("ar");
    expect(captured.url?.searchParams.get("format")).toBe("json");
  });

  it("searchAddress returns an empty array for an empty query without hitting the network", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const results = await searchAddress("   ");

    expect(results).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("searchAddress returns the parsed results", async () => {
    server.use(
      http.get(`${NOMINATIM_URL}/search`, () =>
        HttpResponse.json([
          { lat: "-39.03", lon: "-67.58", display_name: "Av. Roca 1240, General Roca", address: {} },
        ]),
      ),
    );

    const results = await searchAddress("Av. Roca 1240", "General Roca");

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe("Av. Roca 1240, General Roca");
  });

  it("reverseGeocode returns null on a failed response", async () => {
    server.use(http.get(`${NOMINATIM_URL}/reverse`, () => new HttpResponse(null, { status: 500 })));

    const result = await reverseGeocode(-39.03, -67.58);

    expect(result).toBeNull();
  });

  it("reverseGeocode returns the parsed address", async () => {
    server.use(
      http.get(`${NOMINATIM_URL}/reverse`, () =>
        HttpResponse.json({
          lat: "-39.03",
          lon: "-67.58",
          display_name: "Av. Roca 1240, General Roca",
          address: { road: "Av. Roca", house_number: "1240" },
        }),
      ),
    );

    const result = await reverseGeocode(-39.03, -67.58);

    expect(result?.address.road).toBe("Av. Roca");
  });
});
