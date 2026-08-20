"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { sesaleWhatsappHref } from "@/features/plans/lib/whatsapp";

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdown(launchDate: Date): Countdown | null {
  const diffMs = launchDate.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function useCountdown(launchDateIso: string | undefined): Countdown | null {
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    if (!launchDateIso) return undefined;

    const launchDate = new Date(launchDateIso);
    if (Number.isNaN(launchDate.getTime())) return undefined;

    setCountdown(getCountdown(launchDate));
    const interval = setInterval(() => {
      setCountdown(getCountdown(launchDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [launchDateIso]);

  return countdown;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-3 py-2 min-w-[64px]">
      <span className="text-2xl font-black tabular-nums text-foreground">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-4">{label}</span>
    </div>
  );
}

export function ProximamenteContent() {
  const launchDateIso = process.env.NEXT_PUBLIC_LAUNCH_DATE || undefined;
  const countdown = useCountdown(launchDateIso);

  return (
    <main className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Link href="/" className="flex items-center gap-2" aria-label="seSALE">
        <span className="text-3xl font-black tracking-tight text-foreground">se</span>
        <span className="text-3xl font-black tracking-tight text-primary">SALE</span>
        <span className="mb-1.5 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
      </Link>

      <svg
        viewBox="0 0 120 120"
        className="h-24 w-24 text-primary"
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      >
        <circle cx="60" cy="60" r="46" strokeOpacity="0.25" />
        <path d="M60 14 A46 46 0 0 1 106 60" strokeLinecap="round">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 60 60"
            to="360 60 60"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
      </svg>

      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Estamos preparando algo increíble
        </h1>
        <p className="text-sm text-ink-4">La agenda cultural del Alto Valle llega pronto.</p>
      </div>

      {countdown && (
        <div className="flex items-center gap-2" data-testid="proximamente-countdown">
          <CountdownUnit value={countdown.days} label="días" />
          <CountdownUnit value={countdown.hours} label="hs" />
          <CountdownUnit value={countdown.minutes} label="min" />
          <CountdownUnit value={countdown.seconds} label="seg" />
        </div>
      )}

      <a
        href={sesaleWhatsappHref("Quiero que me avises cuando seSALE esté disponible")}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
      >
        Avisame cuando esté lista
      </a>

      <footer className="mt-8 flex flex-col items-center gap-2 text-xs text-ink-5">
        <p>© seSALE 2025</p>
        <Link href="/login" className="text-ink-5 underline-offset-2 hover:underline">
          Acceso staff →
        </Link>
      </footer>
    </main>
  );
}
