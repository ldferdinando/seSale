import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaUpload } from "@/components/MediaUpload";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";
const LOCATION_ID = "22222222-2222-2222-2222-222222222222";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

describe("MediaUpload", () => {
  beforeEach(() => {
    // jsdom no implementa createObjectURL
    URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the upload dropzone when there is no current media", () => {
    render(
      <MediaUpload type="flyer" entityId={EVENT_ID} currentUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    expect(screen.getByTestId("media-drop-zone")).toBeInTheDocument();
    expect(screen.queryByTestId("media-current-preview")).not.toBeInTheDocument();
  });

  it("shows the current media preview with Cambiar/Eliminar when currentUrl is set", () => {
    render(
      <MediaUpload
        type="flyer"
        entityId={EVENT_ID}
        currentUrl="https://example.com/flyer.jpg"
        onUploadSuccess={vi.fn()}
        onDeleteSuccess={vi.fn()}
      />,
    );

    expect(screen.getByTestId("media-current-preview")).toBeInTheDocument();
    expect(screen.getByText("Cambiar")).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
    expect(screen.queryByTestId("media-drop-zone")).not.toBeInTheDocument();
  });

  it("shows an inline error when the file is larger than 5MB, without calling the API", async () => {
    const user = userEvent.setup();
    render(
      <MediaUpload type="flyer" entityId={EVENT_ID} currentUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    const tooBig = makeFile("flyer.png", "image/png", 5 * 1024 * 1024 + 1);
    await user.upload(screen.getByTestId("media-file-input"), tooBig);

    expect(await screen.findByRole("alert")).toHaveTextContent(/tamaño máximo/i);
    expect(screen.queryByTestId("media-new-preview")).not.toBeInTheDocument();
  });

  it("shows an inline error for a disallowed format, without calling the API", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(
      <MediaUpload type="flyer" entityId={EVENT_ID} currentUrl={null} onUploadSuccess={vi.fn()} onDeleteSuccess={vi.fn()} />,
    );

    const pdf = makeFile("flyer.pdf", "application/pdf", 1024);
    await user.upload(screen.getByTestId("media-file-input"), pdf);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Formato no permitido/i);
  });

  it("shows an immediate preview and uploads a flyer on a valid file (POST /api/events/{id}/flyer)", async () => {
    const user = userEvent.setup();
    const onUploadSuccess = vi.fn();
    server.use(
      http.post(`${API_URL}/api/events/${EVENT_ID}/flyer`, () =>
        HttpResponse.json({ flyer_url: "https://storage.example.com/flyer.jpg" }),
      ),
    );

    render(
      <MediaUpload type="flyer" entityId={EVENT_ID} currentUrl={null} onUploadSuccess={onUploadSuccess} onDeleteSuccess={vi.fn()} />,
    );

    const valid = makeFile("flyer.png", "image/png", 1024);
    await user.upload(screen.getByTestId("media-file-input"), valid);

    expect(screen.getByTestId("media-new-preview")).toBeInTheDocument();

    await user.click(screen.getByText("Subir"));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith("https://storage.example.com/flyer.jpg"));
    expect(await screen.findByText(/subido correctamente/i)).toBeInTheDocument();
  });

  it("uploads a cover on a valid file (POST /api/admin/gastro/{id}/cover)", async () => {
    const user = userEvent.setup();
    const onUploadSuccess = vi.fn();
    server.use(
      http.post(`${API_URL}/api/admin/gastro/${LOCATION_ID}/cover`, () =>
        HttpResponse.json({ cover_img_url: "https://storage.example.com/cover.jpg" }),
      ),
    );

    render(
      <MediaUpload type="cover" entityId={LOCATION_ID} currentUrl={null} onUploadSuccess={onUploadSuccess} onDeleteSuccess={vi.fn()} />,
    );

    const valid = makeFile("cover.png", "image/png", 1024);
    await user.upload(screen.getByTestId("media-file-input"), valid);
    await user.click(screen.getByText("Subir"));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith("https://storage.example.com/cover.jpg"));
    expect(await screen.findByText(/portada subida correctamente/i)).toBeInTheDocument();
  });

  it("asks for confirmation before deleting a flyer, and calls onDeleteSuccess after confirming", async () => {
    const user = userEvent.setup();
    const onDeleteSuccess = vi.fn();
    server.use(http.delete(`${API_URL}/api/events/${EVENT_ID}/flyer`, () => HttpResponse.json({ flyer_url: null })));

    render(
      <MediaUpload
        type="flyer"
        entityId={EVENT_ID}
        currentUrl="https://example.com/flyer.jpg"
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

  it("deletes a cover (DELETE /api/admin/gastro/{id}/cover)", async () => {
    const user = userEvent.setup();
    const onDeleteSuccess = vi.fn();
    server.use(
      http.delete(`${API_URL}/api/admin/gastro/${LOCATION_ID}/cover`, () => HttpResponse.json({ cover_img_url: null })),
    );

    render(
      <MediaUpload
        type="cover"
        entityId={LOCATION_ID}
        currentUrl="https://example.com/cover.jpg"
        onUploadSuccess={vi.fn()}
        onDeleteSuccess={onDeleteSuccess}
      />,
    );

    await user.click(screen.getByText("Eliminar"));
    await user.click(screen.getByText("Sí, eliminar"));

    await waitFor(() => expect(onDeleteSuccess).toHaveBeenCalledTimes(1));
  });
});
