import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CountStepper } from "./CountStepper";

describe("CountStepper", () => {
  it("increments, decrements and never goes below zero", () => {
    const onChange = vi.fn();
    const { rerender } = render(<CountStepper value={0} onChange={onChange} color="#15803D" label="Veg" />);
    expect(screen.getByRole("button", { name: "Veg −" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Veg +" }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    rerender(<CountStepper value={45} onChange={onChange} color="#15803D" label="Veg" />);
    fireEvent.click(screen.getByRole("button", { name: "Veg −" }));
    expect(onChange).toHaveBeenLastCalledWith(44);
  });

  it("accepts typed numbers and strips non-digits", () => {
    const onChange = vi.fn();
    render(<CountStepper value={0} onChange={onChange} color="#15803D" label="Veg" />);
    fireEvent.change(screen.getByLabelText("Veg"), { target: { value: "5a0" } });
    expect(onChange).toHaveBeenLastCalledWith(50);
  });
});
