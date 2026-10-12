import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/LegalDocument";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

// Página pública exigida por Google para habilitar "Continuar con Google".
// Cada punto está contrastado con la implementación real (ver a_revisar.md):
// si cambia qué datos se piden o guardan, actualizar este texto y la fecha
// en lib/legal.ts.
export const metadata: Metadata = {
  title: "Política de Privacidad — seSALE",
  description: "Qué datos recolecta seSALE, para qué los usa y qué derechos tenés sobre ellos.",
};

export default function PrivacidadPage() {
  return (
    <LegalDocument title="Política de Privacidad">
      <LegalSection title="1. Quiénes somos">
        <p>
          seSALE es una agenda cultural digital para el Alto Valle de la Patagonia (Argentina). Esta política
          explica qué datos recolectamos, para qué los usamos y qué derechos tenés sobre ellos.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos recolectamos">
        <ul className="flex flex-col gap-1.5">
          <li>
            <strong>Al navegar la agenda:</strong> no hace falta ninguna cuenta ni dato personal. Si permitís el
            acceso a tu ubicación, la usamos solo dentro de tu navegador para detectar tu ciudad; no la enviamos
            ni la guardamos en nuestros servidores.
          </li>
          <li>
            <strong>Al crear una cuenta para publicar:</strong> email, contraseña (nunca se almacena en texto
            plano, solo un hash), nombre real y nombre público. De forma opcional: tipo y número de documento (DNI
            o CUIT, que usamos para verificar tu identidad como organizador), teléfono, WhatsApp de contacto y
            ciudad.
          </li>
          <li>
            <strong>Si iniciás sesión con Google:</strong> recibimos tu email, tu nombre y el identificador de tu
            cuenta de Google, que usamos únicamente para crear o identificar tu cuenta en seSALE. No accedemos a
            ningún otro dato de tu cuenta de Google y no compartimos esta información con terceros.
          </li>
          <li>
            <strong>Al publicar un evento:</strong> los datos del evento y los medios de contacto que vos elijas
            publicar (WhatsApp, email, Instagram, Facebook, sitio web), además del flyer o las imágenes que subas.
          </li>
          <li>
            <strong>Si contratás un plan de visibilidad:</strong> el plan, el monto, el medio de pago y, si pagás
            por transferencia, la nota opcional que nos dejes al avisarnos. Si pagás con MercadoPago, el pago lo
            procesa MercadoPago y nosotros solo guardamos el identificador de la operación. seSALE no procesa ni
            almacena datos de tarjetas de crédito o débito.
          </li>
          <li>
            <strong>Si reportás un evento o lugar:</strong> el texto del reporte y el teléfono de contacto que nos
            dejes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para qué usamos tus datos">
        <ul className="flex flex-col gap-1.5">
          <li>Crear y gestionar tu cuenta.</li>
          <li>Verificar tu identidad como organizador.</li>
          <li>Revisar las publicaciones antes de que aparezcan en la agenda y atender reportes.</li>
          <li>
            Mandarte emails operativos (recuperación de contraseña, confirmaciones de pago, avisos sobre tus
            publicaciones) a través de nuestro proveedor de email (Resend).
          </li>
          <li>Mostrar, si vos lo elegís, tus datos de contacto públicos en tus eventos publicados.</li>
        </ul>
        <p>
          Tu nombre real, documento y teléfono son privados: solo los ve el equipo de seSALE y nunca se publican.
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién compartimos datos">
        <p>
          No vendemos ni compartimos tus datos personales con terceros con fines comerciales. Usamos proveedores de
          infraestructura que procesan datos en nuestro nombre, bajo sus propias políticas de seguridad, únicamente
          para operar el servicio: hosting y base de datos (Vercel, Railway), almacenamiento de imágenes
          (Supabase), envío de emails (Resend), inicio de sesión (Google), pagos (MercadoPago) y mapas y búsqueda de
          direcciones (OpenStreetMap).
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo guardamos tus datos">
        <p>
          Mientras tu cuenta esté activa. Si pedís borrar tu cuenta, eliminamos tus datos personales salvo que
          debamos conservar algo por obligación legal (por ejemplo, registros de pagos).
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Podés pedir acceso, corrección o eliminación de tus datos personales escribiéndonos a{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-primary">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . De acuerdo con la Ley 25.326 de Protección de Datos Personales de Argentina, tenés derecho a acceder,
          rectificar y suprimir tus datos.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies y almacenamiento">
        <p>
          Usamos cookies técnicas necesarias para mantener tu sesión iniciada. También guardamos en tu navegador
          tu ciudad elegida y tu preferencia de tema (claro/oscuro). No usamos cookies de rastreo publicitario ni
          herramientas de analítica de terceros.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios a esta política">
        <p>
          Podemos actualizar esta política; la fecha de &ldquo;última actualización&rdquo; de arriba refleja la
          versión vigente.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Para consultas sobre privacidad:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-primary">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
