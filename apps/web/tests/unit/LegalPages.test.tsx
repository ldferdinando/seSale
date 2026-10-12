import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import PrivacidadPage from "@/app/privacidad/page";
import RegistroPage from "@/app/registro/page";
import TerminosPage from "@/app/terminos/page";
import { LegalLinks } from "@/components/LegalLinks";
import { ThemeProvider } from "@/features/theme/context/ThemeContext";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("PrivacidadPage", () => {
  it("renderiza título, fecha, secciones y el email de contacto", () => {
    renderWithProviders(<PrivacidadPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Política de Privacidad" })).toBeInTheDocument();
    expect(screen.getByText(`Última actualización: ${LEGAL_LAST_UPDATED}`)).toBeInTheDocument();
    for (const heading of [
      "1. Quiénes somos",
      "2. Qué datos recolectamos",
      "6. Tus derechos",
      "7. Cookies y almacenamiento",
      "9. Contacto",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    }
    const mailLinks = screen.getAllByRole("link", { name: LEGAL_CONTACT_EMAIL });
    expect(mailLinks.length).toBeGreaterThan(0);
    for (const link of mailLinks) expect(link).toHaveAttribute("href", `mailto:${LEGAL_CONTACT_EMAIL}`);
  });

  it("describe el login con Google sin mencionar la foto de perfil (no se usa)", () => {
    renderWithProviders(<PrivacidadPage />);

    expect(screen.getByText(/Si iniciás sesión con Google/)).toBeInTheDocument();
    expect(screen.queryByText(/foto/i)).not.toBeInTheDocument();
  });
});

describe("TerminosPage", () => {
  it("renderiza título, fecha y secciones", () => {
    renderWithProviders(<TerminosPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Términos de Servicio" })).toBeInTheDocument();
    expect(screen.getByText(`Última actualización: ${LEGAL_LAST_UPDATED}`)).toBeInTheDocument();
    for (const heading of ["1. Qué es seSALE", "4. Contenido permitido", "5. Planes pagos", "9. Contacto"]) {
      expect(screen.getByRole("heading", { level: 2, name: heading })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: LEGAL_CONTACT_EMAIL })).toHaveAttribute(
      "href",
      `mailto:${LEGAL_CONTACT_EMAIL}`,
    );
  });
});

describe("LegalLinks", () => {
  it("linkea a /terminos y /privacidad", () => {
    render(<LegalLinks />);

    expect(screen.getByRole("link", { name: "Términos de Servicio" })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});

describe("RegistroPage", () => {
  it("muestra el aviso de aceptación con links a Términos y Privacidad", () => {
    renderWithProviders(<RegistroPage />);

    expect(screen.getByText(/Al registrarte aceptás nuestros/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Términos de Servicio" })).toHaveAttribute("href", "/terminos");
    expect(screen.getByRole("link", { name: "Política de Privacidad" })).toHaveAttribute("href", "/privacidad");
  });
});
