import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlyerUpload } from "@/components/FlyerUpload";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

describe("FlyerUpload", () => {
  beforeEach(() => {
    // jsdom no implementa createObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the upload dropzone when there is no current flyer", () => {
    render(
      <FlyerUpload eventId={EVENT_ID} currentFlyerUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    expect(screen.getByTestId("flyer-drop-zone")).toBeInTheDocument();
    expect(screen.queryByTestId("flyer-current-preview")).not.toBeInTheDocument();
  });

  it("shows the current flyer preview with Cambiar/Eliminar when currentFlyerUrl is set", () => {
    render(
      <FlyerUpload
        eventId={EVENT_ID}
        currentFlyerUrl="https://example.com/flyer.jpg"
        onUploadSuccess={vi.fn()}
        onDeleteSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId("flyer-current-preview")).toBeInTheDocument();
    expect(screen.getByText("Cambiar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
    expect(screen.queryByTestId("flyer-drop-zone")).not.toBeInTheDocument();
  });

  it("shows an inline error when the file is larger than 5MB, without calling the API", async () => {
    const user = userEvent.setup();
    render(
      <FlyerUpload eventId={EVENT_ID} currentFlyerUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    const tooBig = makeFile("flyer.png", "image/png", 5 * 1024 * 1024 + 1);
    await user.upload(screen.getByTestId("flyer-file-input"), tooBig);

    expect(await screen.findByRole("alert")).toHaveTextContent(/tamaño máximo/i);
    expect(screen.queryByTestId("flyer-new-preview")).not.toBeInTheDocument();
  });

  it("shows an inline error for a disallowed format, without calling the API", async () => {
    // applyAccept:false — el input filtra por el atributo accept, pero acá
    // queremos probar la validación propia del componente ante un archivo
    // con content-type inválido (ej. alguien renombra un .pdf a .png).
    const user = userEvent.setup({ applyAccept: false });
    render(
      <FlyerUpload eventId={EVENT_ID} currentFlyerUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    const pdf = makeFile("flyer.pdf", "application/pdf", 1024);
    await user.upload(screen.getByTestId("flyer-file-input"), pdf);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Formato no permitido/i);
  });

  it("shows an immediate preview and uploads on a valid file", async () => {
    const user = userEvent.setup();
    const onUploadSuccess = vi.fn();
    server.use(
      http.post(`${API_URL}/api/events/${EVENT_ID}/flyer`, () =>
        HttpResponse.json({ flyer_url: "https://storage.example.com/flyer.jpg" }),
      ),
    );

    render(
      <FlyerUpload
        eventId={EVENT_ID}
        currentFlyerUrl={null}
        onUploadSuccess={onUploadSuccess}
        onDeleteSuccess={vi.fn()}
      />,
    );

    const valid = makeFile("flyer.png", "image/png", 1024);
    await user.upload(screen.getByTestId("flyer-file-input"), valid);

    expect(screen.getByTestId("flyer-new-preview")).toBeInTheDocument();

    await user.click(screen.getByText("Subir flyer"));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith("https://storage.example.com/flyer.jpg"));
    expect(await screen.findByText(/subido correctamente/i)).toBeInTheDocument();
  });

  it("asks for confirmation before deleting, and calls onDeleteSuccess after confirming", async () => {
    const user = userEvent.setup();
    const onDeleteSuccess = vi.fn();
    server.use(http.delete(`${API_URL}/api/events/${EVENT_ID}/flyer`, () => HttpResponse.json({ flyer_url: null })));

    render(
      <FlyerUpload
        eventId={EVENT_ID}
        currentFlyerUrl="https://example.com/flyer.jpg"
        onUploadSuccess={vi.fn()}
        onDeleteSuccess={onDeleteSuccess}
      />,
    );

    await user.click(screen.getByText("Eliminar"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(onDeleteSuccess).not.toHaveBeenCalled();

    await user.click(screen.getByText("Sí, eliminar"));

    await waitFor(() => expect(onDeleteSuccess).toHaveBeenCalledTimes(1));
  });
});
