import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimePicker } from "@/features/events/components/TimePicker";

describe("TimePicker", () => {
  it("solo ofrece valores numéricos 24hs, nunca AM/PM", async () => {
    const user = userEvent.setup();
    render(<TimePicker label="Hora inicio" value="" onChange={vi.fn()} />);

    await user.click(screen.getByLabelText("Hora inicio — hora"));
    const options = await screen.findAllByRole("option");
    const optionLabels = options.map((o) => o.textContent);

    expect(optionLabels).toContain("00");
    expect(optionLabels).toContain("23");
    expect(optionLabels.some((label) => /am|pm/i.test(label ?? ""))).toBe(false);
  });

  it("llama a onChange con el formato HH:mm al elegir hora y minutos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimePicker label="Hora inicio" value="" onChange={onChange} />);

    await user.click(screen.getByLabelText("Hora inicio — hora"));
    await user.click(await screen.findByRole("option", { name: "20" }));
    expect(onChange).toHaveBeenLastCalledWith("20:00");
  });

  it("muestra el valor inicial separado en hora y minutos", () => {
    render(<TimePicker label="Hora fin" value="23:30" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Hora fin — hora")).toHaveTextContent("23");
    expect(screen.getByLabelText("Hora fin — minutos")).toHaveTextContent("30");
  });
});
