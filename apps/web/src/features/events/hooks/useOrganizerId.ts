"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sesale.organizer_id";

/**
 * Reemplaza al usuario autenticado mientras no existe auth real (llega en Etapa 3).
 * Persiste el user_id que el organizador ingresa manualmente en localStorage.
 */
export function useOrganizerId() {
  const [organizerId, setOrganizerIdState] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setOrganizerIdState(stored);
  }, []);

  const setOrganizerId = useCallback((value: string) => {
    setOrganizerIdState(value);
    window.localStorage.setItem(STORAGE_KEY, value);
  }, []);

  return { organizerId, setOrganizerId };
}
