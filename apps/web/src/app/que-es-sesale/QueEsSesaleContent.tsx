"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Eye,
  Heart,
  Info,
  ListOrdered,
  MapPin,
  MessageCircle,
  Pencil,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Store,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

/**
 * Etapa "Ajustes de diseño reportados" (Parte 2, revisitada dos veces) —
 * la versión anterior (Etapa 11b) era solo un `<h1>` + 4 párrafos. Una
 * primera vuelta agregó las secciones de contenido que faltaban
 * ("Por qué seSALE"/"¿Para quién es?"/"Cómo funciona") pero mantuvo el
 * viejo encabezado simple — la usuaria pidió explícitamente que quedara
 * IGUAL al `.qe-hero` de `#s-que-es` en seSALE_v2.html, no solo parecido.
 * Esta vuelta reconstruye también el hero: banda oscura de ancho completo
 * (fija, no reactiva al tema — igual criterio que la marca del Navbar,
 * ver Logo.tsx) con el logo grande, el tag "Agenda cultural digital" y
 * las 3 stats centradas, calcado 1:1 de `.qe-hero`/`.qe-tag`/`.qe-stats`.
 * El resto de las secciones (agregadas en la vuelta anterior) sigue
 * usando tokens ya establecidos del sistema de diseño.
 */

interface DifItemProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

function DifItem({ icon: Icon, title, description }: DifItemProps) {
  return (
    <div className="rounded-r-lg border-l-[3px] border-primary bg-surface-2 px-3.5 py-3">
      <p className="flex items-center gap-2 text-sm font-bold text-ink-1">
        <Icon className="h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
        {title}
      </p>
      {description && <p className="mt-1 text-xs leading-relaxed text-ink-5">{description}</p>}
    </div>
  );
}

interface AudienceCardProps {
  emoji: string;
  title: string;
  description: string;
  tagLabel: string;
  tagClassName: string;
}

function AudienceCard({ emoji, title, description, tagLabel, tagClassName }: AudienceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-3.5">
      <div className="mb-2 text-2xl" aria-hidden>
        {emoji}
      </div>
      <p className="text-sm font-bold text-ink-1">{title}</p>
      <p className="mt-0.5 text-xs leading-snug text-ink-5">{description}</p>
      <span className={`mt-1.5 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${tagClassName}`}>
        {tagLabel}
      </span>
    </div>
  );
}

interface StepProps {
  icon: LucideIcon;
  iconClassName: string;
  step: string;
  title: string;
  description: string;
}

function Step({ icon: Icon, iconClassName, step, title, description }: StepProps) {
  return (
    <div className="flex items-start gap-3.5">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wide text-primary">{step}</p>
        <p className="text-sm font-bold text-ink-1">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-5">{description}</p>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </p>
  );
}

export function QueEsSesaleContent() {
  return (
    <main className="flex flex-col">
      {/* Header — mismo patrón de "volver" que PlanesContent.tsx/LugaresPage. */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 text-ink-3">
        <Link href="/" className="flex items-center gap-3">
          <ArrowLeft className="h-5 w-5 text-primary" aria-hidden />
        </Link>
        <h1 className="text-sm font-medium">¿Qué es seSALE?</h1>
      </header>

      {/* Hero — calcado de .qe-hero en seSALE_v2.html: banda oscura de ancho
          completo, fija en los dos temas (igual criterio que el Navbar: la
          marca no reacciona al tema — ver Logo.tsx), con franja superior de
          acento en --F. */}
      <div className="relative overflow-hidden bg-[linear-gradient(180deg,#0d0d0d_0%,#1a0d14_100%)] px-5 py-8 text-center">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-brand-pink" aria-hidden />

        <div className="mx-auto flex flex-col items-center gap-3">
          <Logo size="lg" />

          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.3em] text-brand-pink">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Agenda cultural digital
          </p>

          <p className="max-w-[340px] text-[15.5px] leading-relaxed text-[#d4d4d4]">
            <strong className="text-white">seSale es la agenda cultural de tu ciudad.</strong> Es{" "}
            <strong className="text-white">colaborativa</strong>, ¡así que corré la voz! Queremos que todos los
            eventos estén acá. Y es <strong className="text-white">GRATIS</strong>. Todo lo que pasa, en un solo
            lugar — música en vivo, teatro, ferias, fiestas y más. Y también dónde comer o tomar algo antes o
            después.
          </p>

          <div className="mt-2 flex w-full justify-center gap-6 border-t border-[#1e1e1e] pt-4">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-black text-white">100%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8f8f8f]">Local</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-black text-white">Gratis</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8f8f8f]">
                Para el público
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-lg font-black text-white">Real</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8f8f8f]">Verificado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-ink-2">
          <p>seSALE es la agenda cultural del Alto Valle de la Patagonia.</p>
          <p>
            Encontrá todos los eventos culturales de tu ciudad: música en vivo, teatro, ferias, fiestas, standup,
            milongas y mucho más.
          </p>
          <p>Si organizás eventos, podés publicarlos gratis y llegar a toda la comunidad del Alto Valle.</p>
          <p>Estamos en General Roca, Cipolletti y próximamente en más ciudades de la región.</p>
        </div>

        {/* "Por qué seSALE" — calcado de .dif-list en seSALE_v2.html */}
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Star}>Por qué seSALE</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <DifItem icon={MapPin} title="Es tuya, de tu ciudad" />
            <DifItem
              icon={ShieldCheck}
              title="Cada organizador está verificado"
              description="Para publicar hay que verificar identidad con DNI o CUIT. Sabés que hay una persona real y responsable detrás de cada evento."
            />
            <DifItem
              icon={Coins}
              title="Publicar es gratis"
              description="Cualquier persona puede publicar su evento sin pagar nada. Los planes pagos son para quienes quieren más visibilidad."
            />
            <DifItem
              icon={Store}
              title="Eventos + lugares en un solo lugar"
              description="Encontrás el show y también la parrilla donde cenar antes. Todo para planificar tu salida completa."
            />
          </div>
        </div>

        {/* "¿Para quién es?" — calcado de .pq-grid en seSALE_v2.html */}
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Users}>¿Para quién es?</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <AudienceCard
              emoji="🎵"
              title="Bandas y artistas"
              description="Publicá tus shows y llegá a toda la ciudad."
              tagLabel="Publicar gratis"
              tagClassName="bg-brand-violet/15 text-brand-violet"
            />
            <AudienceCard
              emoji="🍺"
              title="Bares y espacios"
              description="Sumá eventos y tu lugar a la agenda nocturna."
              tagLabel="Con visibilidad"
              tagClassName="bg-primary/15 text-primary"
            />
            <AudienceCard
              emoji="🎭"
              title="Teatros"
              description="Tu cartelera siempre actualizada y visible."
              tagLabel="Cartelera"
              tagClassName="bg-brand-amber/15 text-brand-amber"
            />
            <AudienceCard
              emoji="🔍"
              title="El público"
              description="Todo lo que pasa en tu ciudad, en un lugar."
              tagLabel="100% gratis"
              tagClassName="bg-brand-green/15 text-brand-green"
            />
          </div>
        </div>

        <div className="border-t border-border" />

        {/* "Cómo funciona — Para el público" — calcado de .pasos-sec en seSALE_v2.html */}
        <div className="flex flex-col gap-4">
          <SectionLabel icon={ListOrdered}>Cómo funciona — Para el público</SectionLabel>
          <Step
            icon={MapPin}
            iconClassName="bg-primary/15 text-primary"
            step="Paso 1"
            title="Abrís seSALE"
            description="Detectamos tu ciudad automáticamente o la elegís vos. Solo ves lo que pasa cerca tuyo."
          />
          <Step
            icon={SlidersHorizontal}
            iconClassName="bg-brand-violet/15 text-brand-violet"
            step="Paso 2"
            title="Filtrás cuándo y qué"
            description="Esta noche, este finde, vacaciones de invierno... y por categoría."
          />
          <Step
            icon={Heart}
            iconClassName="bg-brand-green/15 text-brand-green"
            step="Paso 3"
            title="Encontrás tu plan"
            description="Ves todos los detalles, cómo conseguir entradas y el organizador verificado."
          />
          <Step
            icon={MessageCircle}
            iconClassName="bg-brand-whatsapp/15 text-brand-whatsapp"
            step="Paso 4"
            title="Compartís con tus amigos"
            description="Un toque y lo mandás por WhatsApp. También ves dónde comer o tomar algo antes."
          />
        </div>

        <div className="border-t border-border" />

        {/* "Cómo funciona — Para organizadores" — ídem, segunda variante */}
        <div className="flex flex-col gap-4">
          <SectionLabel icon={Rocket}>Cómo funciona — Para organizadores</SectionLabel>
          <p className="-mt-2 text-xs leading-relaxed text-ink-3">
            Publicar es <strong className="text-ink-1">siempre gratis</strong>: podés subir todos los eventos o
            lugares reales que tengas, sin límite de cantidad (solo pedimos no repetir el mismo aviso). Si además
            querés más visibilidad, existen planes pagos <strong className="text-ink-1">opcionales</strong> para
            destacarte — nunca hace falta pagar para publicar.
          </p>
          <Step
            icon={UserPlus}
            iconClassName="bg-primary/15 text-primary"
            step="Paso 1"
            title="Creás tu cuenta gratis"
            description="Verificás identidad con DNI o CUIT. Tus datos personales son privados — el público solo ve tu nombre de perfil y lo que vos elegís mostrar."
          />
          <Step
            icon={Pencil}
            iconClassName="bg-brand-violet/15 text-brand-violet"
            step="Paso 2"
            title="Cargás tu evento"
            description="Nombre, categoría, fecha, lugar y tipo de entrada. Menos de 3 minutos."
          />
          <Step
            icon={Eye}
            iconClassName="bg-brand-amber/15 text-brand-amber"
            step="Paso 3"
            title="Se revisa y aparece"
            description="Revisión rápida. Cuentas verificadas con historial limpio se aprueban automáticamente."
          />
          <Step
            icon={Rocket}
            iconClassName="bg-brand-green/15 text-brand-green"
            step="Paso 4"
            title="Tu evento llega a toda la ciudad"
            description="En la grilla, el mapa y los filtros. Mejorás visibilidad con planes pagos cuando quieras."
          />
        </div>

        {/* Aviso — calcado del recuadro final de #s-que-es en seSALE_v2.html */}
        <div className="flex items-start gap-2 rounded-xl bg-surface-1 p-3.5 text-xs leading-relaxed text-ink-4">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden />
          <span>
            seSALE <strong className="text-ink-2">no es</strong> para delivery, clases, servicios ni venta de
            productos. Solo eventos culturales y lugares donde salir.
          </span>
        </div>

        <Button asChild className="w-fit gap-1.5">
          <Link href="/">
            Ver eventos
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </main>
  );
}
