import { describe, expect, it } from "vitest";

import { priceModeLabel } from "@/features/events/lib/priceMode";

describe("priceModeLabel", () => {
  it("returns null for 'fixed' (el monto numérico se muestra aparte)", () => {
    expect(priceModeLabel("fixed")).toBeNull();
  });

  it("returns 'Consultar precio' for 'consultar'", () => {
    expect(priceModeLabel("consultar")).toBe("Consultar precio");
  });

  it("returns 'Ver precios en la descripción' for 'ver_descripcion'", () => {
    expect(priceModeLabel("ver_descripcion")).toBe("Ver precios en la descripción");
  });
});
