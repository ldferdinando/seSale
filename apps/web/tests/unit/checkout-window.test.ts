import { afterEach, describe, expect, it, vi } from "vitest";

import { closeCheckoutWindow, goToCheckout, openCheckoutWindow } from "@/features/plans/lib/checkout-window";

const INIT_POINT = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-123";

function makeFakeWindow(overrides: Partial<{ closed: boolean }> = {}) {
  return { location: { href: "" }, closed: false, close: vi.fn(), opener: window as Window | null, ...overrides };
}

describe("checkout-window", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("openCheckoutWindow abre una pestaña en blanco y corta el opener", () => {
    const fake = makeFakeWindow();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(fake as unknown as Window);

    const result = openCheckoutWindow();

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(result).toBe(fake);
    expect(fake.opener).toBeNull();
  });

  it("openCheckoutWindow devuelve null si el navegador bloquea la pestaña", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(openCheckoutWindow()).toBeNull();
  });

  it("goToCheckout navega la pestaña nueva al init_point", () => {
    const fake = makeFakeWindow();

    goToCheckout(fake as unknown as Window, INIT_POINT);

    expect(fake.location.href).toBe(INIT_POINT);
  });

  it("goToCheckout redirige la pestaña actual si no hay pestaña nueva", () => {
    const originalLocation = window.location;
    // @ts-expect-error jsdom no permite navegación real; reemplazamos el objeto por uno espiable
    delete window.location;
    window.location = { ...originalLocation, href: "" };

    goToCheckout(null, INIT_POINT);

    expect(window.location.href).toBe(INIT_POINT);
    window.location = originalLocation;
  });

  it("closeCheckoutWindow cierra la pestaña si sigue abierta", () => {
    const fake = makeFakeWindow();
    closeCheckoutWindow(fake as unknown as Window);
    expect(fake.close).toHaveBeenCalled();

    const alreadyClosed = makeFakeWindow({ closed: true });
    closeCheckoutWindow(alreadyClosed as unknown as Window);
    expect(alreadyClosed.close).not.toHaveBeenCalled();

    expect(() => closeCheckoutWindow(null)).not.toThrow();
  });
});
