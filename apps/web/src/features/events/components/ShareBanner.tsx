"use client";

import { ChevronRight, MessageCircle } from "lucide-react";

const SHARE_TITLE = "seSALE — Agenda cultural del Alto Valle";
const SHARE_TEXT = "¡Encontrá todos los eventos culturales de la Patagonia en seSALE!";

/** Comparte la app en general (home) — nunca un evento puntual. */
function shareApp() {
  const url = typeof window !== "undefined" ? window.location.origin : "";

  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url }).catch(() => {});
    return;
  }
  if (typeof window !== "undefined") {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`, "_blank");
  }
}

export function ShareBanner() {
  return (
    <button
      type="button"
      onClick={shareApp}
      className="mx-4 mb-5 flex w-[calc(100%-2rem)] items-center gap-3 rounded-xl border border-brand-whatsapp/30 bg-[#1a3a22] p-3.5 text-left"
    >
      <MessageCircle className="h-6 w-6 flex-shrink-0 text-brand-whatsapp" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Compartir seSALE</p>
        <p className="mt-0.5 text-xs text-[#3a8a4a]">Mandala a tus amigos y descubran qué hacer en su ciudad</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-whatsapp" aria-hidden />
    </button>
  );
}
