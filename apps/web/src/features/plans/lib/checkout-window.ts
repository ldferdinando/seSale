/**
 * El checkout de MercadoPago se abre en una pestaña nueva, para que el
 * organizador no pierda seSALE (si cierra MP, sigue teniendo Mis eventos
 * abierto con "Continuar pago").
 *
 * La pestaña se abre en blanco SINCRÓNICAMENTE en el click y recién después
 * se navega al init_point: si se abriera con `window.open(url)` después del
 * `await` del checkout, los navegadores lo bloquean como popup (ya no cuenta
 * como gesto del usuario).
 */
export function openCheckoutWindow(): Window | null {
  const checkoutWindow = window.open("", "_blank");
  if (checkoutWindow) {
    // Equivalente a rel="noopener": MP no puede tocar esta pestaña vía opener.
    checkoutWindow.opener = null;
  }
  return checkoutWindow;
}

/** Navega la pestaña nueva al checkout. Si el navegador bloqueó la pestaña, redirige la actual (comportamiento anterior). */
export function goToCheckout(checkoutWindow: Window | null, initPoint: string): void {
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.location.href = initPoint;
    return;
  }
  window.location.href = initPoint;
}

/** Cierra la pestaña en blanco si el checkout falló. */
export function closeCheckoutWindow(checkoutWindow: Window | null): void {
  if (checkoutWindow && !checkoutWindow.closed) {
    checkoutWindow.close();
  }
}
