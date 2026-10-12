import type { Metadata } from "next";

import { LegalDocument, LegalSection } from "@/components/LegalDocument";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

// Página pública exigida por Google para habilitar "Continuar con Google".
// Contrastada con el comportamiento real del producto (ver a_revisar.md);
// si cambia el flujo de publicación o de pagos, actualizar este texto y la
// fecha en lib/legal.ts.
export const metadata: Metadata = {
  title: "Términos de Servicio — seSALE",
  description: "Condiciones de uso de seSALE, la agenda cultural del Alto Valle de la Patagonia.",
};

export default function TerminosPage() {
  return (
    <LegalDocument title="Términos de Servicio">
      <LegalSection title="1. Qué es seSALE">
        <p>
          Una agenda cultural colaborativa para descubrir y publicar eventos, y encontrar lugares (gastronomía,
          espacios culturales y deportivos) en el Alto Valle de la Patagonia.
        </p>
      </LegalSection>

      <LegalSection title="2. Uso del servicio">
        <p>
          Navegar la agenda es gratuito y no requiere cuenta. Para publicar eventos necesitás una cuenta. Todos los
          eventos pasan por una revisión de nuestro equipo antes de aparecer en la agenda.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuentas y verificación">
        <p>
          Podemos verificar tu identidad como organizador con DNI o CUIT. Sos responsable de la veracidad de la
          información que cargás en tu cuenta y en tus publicaciones, y de mantener la confidencialidad de tu
          contraseña.
        </p>
      </LegalSection>

      <LegalSection title="4. Contenido permitido">
        <p>
          seSALE es para eventos culturales, infantiles, deportivos y festivales, y para lugares de gastronomía y
          espacios donde salir. No está permitido publicar servicios, clases, delivery ni venta de productos. Nos
          reservamos el derecho de rechazar o eliminar publicaciones que no cumplan este criterio, sean falsas o
          infrinjan derechos de terceros.
        </p>
      </LegalSection>

      <LegalSection title="5. Planes pagos">
        <p>
          Publicar un evento con el plan gratis siempre es gratis. Los planes Destacado y Destacado Plus son
          opcionales y otorgan mayor visibilidad al evento según lo descripto en cada plan al momento de
          contratarlo. Se pagan por transferencia bancaria o, cuando está disponible, con MercadoPago. Los pagos por
          transferencia se confirman manualmente por nuestro equipo tras recibir el aviso de transferencia.
        </p>
      </LegalSection>

      <LegalSection title="6. Responsabilidad">
        <p>
          seSALE es una plataforma de difusión. No somos organizadores de los eventos publicados ni garantizamos su
          realización, su calidad ni la veracidad de los datos cargados por terceros. La relación entre el público y
          los organizadores es exclusivamente entre ellos.
        </p>
      </LegalSection>

      <LegalSection title="7. Cuentas suspendidas">
        <p>
          Podemos suspender o eliminar cuentas que publiquen contenido falso o fraudulento, o que violen estos
          términos.
        </p>
      </LegalSection>

      <LegalSection title="8. Modificaciones">
        <p>Podemos modificar estos términos; la fecha de arriba refleja la versión vigente.</p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="font-semibold text-primary">
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
