"use client";

import { ChevronRight, MessageCircle } from "lucide-react";

const SHARE_TEXT = "Descubrí los mejores planes culturales en seSALE 🎉";

export function ShareBanner() {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`.trim())}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-5 flex items-center gap-3 rounded-xl border border-brand-whatsapp/30 bg-[#1a3a22] p-3.5"
    >
      <MessageCircle className="h-6 w-6 flex-shrink-0 text-brand-whatsapp" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">Compartí seSALE</p>
        <p className="mt-0.5 text-xs text-[#3a8a4a]">Mandala a tus amigos y descubran qué hacer en su ciudad</p>
      </div>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-brand-whatsapp" aria-hidden />
    </a>
  );
}
