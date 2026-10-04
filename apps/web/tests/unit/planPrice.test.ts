import { describe, expect, it } from "vitest";

import { formatPlanPrice } from "@/features/plans/lib/plan-price";
import { makePlan } from "./mocks/handlers";

describe("formatPlanPrice", () => {
  it("muestra 'Gratis' para el plan gratuito", () => {
    const plan = makePlan({ plan_type: "gratis", price: { id: "p0", amount: 0, currency: "ARS", promo_label: null } });
    expect(formatPlanPrice(plan)).toBe("Gratis");
  });

  it("muestra el precio real formateado en pesos para Destacado y Destacado Plus", () => {
    expect(formatPlanPrice(makePlan())).toBe("$3.500/mes");
    expect(
      formatPlanPrice(
        makePlan({ plan_type: "pro", price: { id: "p2", amount: 6500, currency: "ARS", promo_label: null } }),
      ),
    ).toBe("$6.500/mes");
  });

  it("nunca muestra 'Gratis' para un plan pago con precio placeholder en $0", () => {
    const plan = makePlan({ price: { id: "p1", amount: 0, currency: "ARS", promo_label: null } });
    expect(formatPlanPrice(plan)).toBe("Consultar precio");
  });

  it("muestra 'Consultar precio' si el plan pago no tiene precio vigente", () => {
    expect(formatPlanPrice(makePlan({ price: null }))).toBe("Consultar precio");
  });
});
