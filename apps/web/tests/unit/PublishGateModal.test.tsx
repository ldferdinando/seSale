import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublishGateModal } from "@/features/events/components/PublishGateModal";

describe("PublishGateModal", () => {
  it("renders the exact copy from seSALE.html", () => {
    render(<PublishGateModal onLogin={vi.fn()} onContinueBrowsing={vi.fn()} />);

    expect(
      screen.getByText("Esta sección es solo para quienes quieran registrar un evento o espacio."),
    ).toBeInTheDocument();
    const bold = screen.getByText("RECORDÁ QUE NAVEGAR ESTA AGENDA ES COMPLETAMENTE LIBRE Y GRATUITA, SIEMPRE.");
    expect(bold.tagName).toBe("B");
    expect(screen.getByTestId("publish-gate-free-box")).toHaveTextContent(
      "Publicar también es GRATIS. Tendrás opciones pagas opcionales para destacar tu evento o espacio si así lo prefieres.",
    );
    expect(screen.getByRole("button", { name: "Ingresar para publicar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir navegando" })).toBeInTheDocument();
  });

  it("calls onLogin from the primary button and onContinueBrowsing from the secondary one", () => {
    const onLogin = vi.fn();
    const onContinueBrowsing = vi.fn();
    render(<PublishGateModal onLogin={onLogin} onContinueBrowsing={onContinueBrowsing} />);

    fireEvent.click(screen.getByRole("button", { name: "Ingresar para publicar" }));
    expect(onLogin).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Seguir navegando" }));
    expect(onContinueBrowsing).toHaveBeenCalledTimes(1);
  });
});
