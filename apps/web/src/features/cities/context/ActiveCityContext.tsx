"use client";

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useCities } from "@/features/auth/hooks/useCities";
import type { City } from "@/features/auth/types";
import {
  clearSavedCity,
  detectCityByLocation,
  findSavedCity,
  getDefaultCity,
  saveSelectedCity,
} from "@/lib/city-detection";

export interface ActiveCityContextValue {
  /** `null` solo hasta que resuelve `GET /api/cities`. */
  activeCity: City | null;
  /** GPS pidiéndose en segundo plano. Informativo: no gatear fetches con esto. */
  isLocating: boolean;
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
 *
 * PERFORMANCE_AUDIT P0-1: sin ciudad guardada, se arranca al instante con la
 * ciudad por defecto (`getDefaultCity`) y el GPS corre en paralelo — antes la
 * UI esperaba hasta `GEOLOCATION_TIMEOUT_MS` sin pedir eventos. Si el GPS
 * encuentra otra ciudad, se cambia en caliente; si falla, queda la default.
 * Una elección manual durante la detección le gana al resultado del GPS.
 */
export function ActiveCityProvider({ children }: ActiveCityProviderProps) {
  const { data: cities } = useCities();
  const [activeCity, setActiveCityState] = useState<City | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [detectionToken, setDetectionToken] = useState(0);
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (!cities || cities.length === 0) return;

    const savedCity = findSavedCity(cities);
    if (savedCity) {
      setActiveCityState(savedCity);
      return;
    }

    const defaultCity = getDefaultCity(cities);
    // En un reset ("Detectar mi ubicación") se mantiene la ciudad visible
    // mientras se detecta, sin volver a la default de golpe.
    setActiveCityState((current) => current ?? defaultCity);
    userPickedRef.current = false;
    setIsLocating(true);

    let cancelled = false;
    detectCityByLocation(cities).then((detected) => {
      if (cancelled) return;
      setIsLocating(false);
      if (userPickedRef.current) return;
      const resolved = detected ?? defaultCity;
      // Se persiste para no volver a pedir GPS en la próxima visita.
      saveSelectedCity(resolved.id);
      setActiveCityState(resolved);
    });

    return () => {
      cancelled = true;
      setIsLocating(false);
    };
  }, [cities, detectionToken]);

  const setActiveCity = useCallback((city: City) => {
    userPickedRef.current = true;
    saveSelectedCity(city.id);
    setActiveCityState(city);
  }, []);

  const resetToDetected = useCallback(() => {
    clearSavedCity();
    setDetectionToken((token) => token + 1);
  }, []);

  return (
    <ActiveCityContext.Provider value={{ activeCity, isLocating, setActiveCity, resetToDetected }}>
      {children}
    </ActiveCityContext.Provider>
  );
}
