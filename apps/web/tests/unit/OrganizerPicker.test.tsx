import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { OrganizerPicker } from "@/features/events/components/OrganizerPicker";
import { server } from "./mocks/server";

const API_URL = "http://localhost:8000";

const USERS = [
  { id: "u1", public_name: "Bar Uno", email: "uno@x.com", role: "user", is_active: true, full_name: "a", doc_type: null, doc_number: null, phone: null, phone_verified: false, email_verified: false, public_whatsapp: null, city_id: null, is_verified: false, created_at: "2024-01-01", created_by: null },
];

function Harness({ onChange }: { onChange: (id: string | undefined) => void }) {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <OrganizerPicker
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange(id);
      }}
    />
  );
}

describe("OrganizerPicker (Etapa 5.6, mismo UserPicker que banners)", () => {
  it("has autocomplete off, shows the chosen organizer and lets the admin go back to 'self'", async () => {
    server.use(http.get(`${API_URL}/api/users`, () => HttpResponse.json(USERS)));
    const onChange = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <Harness onChange={onChange} />
      </QueryClientProvider>,
    );
    const user = userEvent.setup();

    expect(screen.getByLabelText("Buscar organizador")).toHaveAttribute("autocomplete", "off");
    expect(screen.getByText(/el evento queda a tu nombre/)).toBeInTheDocument();

    await user.click(await screen.findByRole("option", { name: /Bar Uno/ }));
    expect(onChange).toHaveBeenLastCalledWith("u1");
    expect(screen.getByRole("group", { name: "Usuario seleccionado" })).toHaveTextContent("uno@x.com");

    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
