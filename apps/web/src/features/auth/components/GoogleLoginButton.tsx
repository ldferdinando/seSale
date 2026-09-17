"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

export interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleLoginButtonProps {
  onCredential: (credential: string) => void;
}

// Widget oficial de Google Identity Services — no un botón custom que imite
// el diseño. Requiere NEXT_PUBLIC_GOOGLE_CLIENT_ID; sin esa variable el
// componente no renderiza nada (login con Google queda oculto, el resto del
// formulario sigue funcionando normalmente).
export function GoogleLoginButton({ onCredential }: GoogleLoginButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const setup = useCallback(() => {
    if (initializedRef.current) return;
    if (!clientId || !buttonRef.current || !window.google) return;
    initializedRef.current = true;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      width: 320,
    });
  }, [clientId, onCredential]);

  // Si el script ya estaba cargado (navegación cliente entre páginas), el
  // onLoad de <Script> no vuelve a dispararse — hace falta este chequeo al
  // montar para inicializar igual.
  useEffect(() => {
    setup();
  }, [setup]);

  if (!clientId) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={setup} />
      <div ref={buttonRef} data-testid="google-login-button" />
    </>
  );
}
