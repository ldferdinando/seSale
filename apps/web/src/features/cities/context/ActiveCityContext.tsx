"use client";

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";

import { useCities } from "@/features/auth/hooks/useCities";
import type { City } from "@/features/auth/types";
import { clearSavedCity, detectUserCity, saveSelectedCity } from "@/lib/city-detection";

const DEFAULT_CITY_NAME = "General Roca";

export interface ActiveCityContextValue {
  activeCity: City | null;
  isDetecting: boolean;
  setActiveCity: (city: City) => void;
  resetToDetected: () => void;
}

export const ActiveCityContext = createContext<ActiveCityContextValue | undefined>(undefined);

interface ActiveCityProviderProps {
  children: ReactNode;
}

/**
 * Etapa 7a — estado global de la ciudad activa, compartido por Navbar, Home
 * y EventForm. Un solo Context (no Zustand, no está instalado) para que la
 * detección por GPS ocurra una sola vez por sesión de navegación, sin
 * importar cuántos componentes consuman `useActiveCity()`.
 */
export function ActiveCityProvider({ children }: ActiveCityProviderProps) {
  const { data: cities } = useCities();
  const [activeCity, setActiveCityState] = useState<City | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionToken, setDetectionToken] = useState(0);

  useEffect(() => {
    if (!cities || cities.length === 0) return;

    let cancelled = false;
    setIsDetecting(true);

    detectUserCity(cities, DEFAULT_CITY_NAME).then((detected) => {
      if (cancelled) return;
      setActiveCityState(detected);
      setIsDetecting(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities, detectionToken]);

  const setActiveCity = useCallback((city: City) => {
    saveSelectedCity(city.id);
    setActiveCityState(city);
  }, []);

  const resetToDetected = useCallback(() => {
    clearSavedCity();
    setDetectionToken((token) => token + 1);
  }, []);

  return (
    <ActiveCityContext.Provider value={{ activeCity, isDetecting, setActiveCity, resetToDetected }}>
      {children}
    </ActiveCityContext.Provider>
  );
}
