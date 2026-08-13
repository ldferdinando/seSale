import { beforeEach, describe, expect, it, vi } from "vitest";

import type { City } from "@/features/auth/types";
import {
  CITY_STORAGE_KEY,
  clearSavedCity,
  detectUserCity,
  findNearestCity,
  getSavedCityId,
  haversineDistance,
  saveSelectedCity,
} from "@/lib/city-detection";

function makeCity(overrides: Partial<City> = {}): City {
  return {
    id: "general-roca",
    name: "General Roca",
    province: "Río Negro",
    emoji: "🏙️",
    is_active: true,
    sort_order: 1,
    latitude: -39.0333,
    longitude: -67.5833,
    ...overrides,
  };
}

const GENERAL_ROCA = makeCity();
const CIPOLLETTI = makeCity({ id: "cipolletti", name: "Cipolletti", latitude: -38.9333, longitude: -68.0 });
const NEUQUEN_INACTIVE = makeCity({
  id: "neuquen",
  name: "Neuquén",
  is_active: false,
  latitude: -38.9516,
  longitude: -68.0591,
});

describe("haversineDistance", () => {
  it("calcula ~38km entre General Roca y Cipolletti (aprox. 50km del pedido)", () => {
    const distance = haversineDistance(
      GENERAL_ROCA.latitude as number,
      GENERAL_ROCA.longitude as number,
      CIPOLLETTI.latitude as number,
      CIPOLLETTI.longitude as number,
    );

    expect(distance).toBeGreaterThan(20);
    expect(distance).toBeLessThan(60);
  });

  it("la distancia de un punto a sí mismo es 0", () => {
    expect(haversineDistance(-39.0333, -67.5833, -39.0333, -67.5833)).toBe(0);
  });
});

describe("findNearestCity", () => {
  const cities = [GENERAL_ROCA, CIPOLLETTI, NEUQUEN_INACTIVE];

  it("con coordenadas de General Roca devuelve General Roca", () => {
    const nearest = findNearestCity(GENERAL_ROCA.latitude as number, GENERAL_ROCA.longitude as number, cities);
    expect(nearest?.id).toBe("general-roca");
  });

  it("con coordenadas de Buenos Aires devuelve null (más de 200km de cualquier ciudad)", () => {
    const nearest = findNearestCity(-34.6037, -58.3816, cities);
    expect(nearest).toBeNull();
  });

  it("ignora ciudades inactivas aunque estén más cerca", () => {
    // Coordenadas casi exactas de Neuquén (inactiva) — debe devolver una ciudad activa igual.
    const nearest = findNearestCity(-38.9516, -68.0591, cities);
    expect(nearest?.id).not.toBe("neuquen");
  });
});

describe("saveSelectedCity / getSavedCityId / clearSavedCity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("guarda y lee la ciudad elegida", () => {
    saveSelectedCity("general-roca");
    expect(getSavedCityId()).toBe("general-roca");
    expect(window.localStorage.getItem(CITY_STORAGE_KEY)).toBe("general-roca");
  });

  it("getSavedCityId devuelve null si no hay nada guardado", () => {
    expect(getSavedCityId()).toBeNull();
  });

  it("clearSavedCity limpia el localStorage", () => {
    saveSelectedCity("general-roca");
    clearSavedCity();
    expect(getSavedCityId()).toBeNull();
  });
});

describe("detectUserCity", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("sin GPS disponible devuelve la ciudad default (General Roca)", async () => {
    vi.stubGlobal("navigator", { geolocation: undefined });

    const city = await detectUserCity([GENERAL_ROCA, CIPOLLETTI]);

    expect(city.id).toBe("general-roca");
  });

  it("con ciudad guardada en localStorage la devuelve sin pedir GPS", async () => {
    saveSelectedCity("cipolletti");
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

    const city = await detectUserCity([GENERAL_ROCA, CIPOLLETTI]);

    expect(city.id).toBe("cipolletti");
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("persiste la ciudad detectada en localStorage", async () => {
    vi.stubGlobal("navigator", { geolocation: undefined });

    await detectUserCity([GENERAL_ROCA, CIPOLLETTI]);

    expect(getSavedCityId()).toBe("general-roca");
  });
});
