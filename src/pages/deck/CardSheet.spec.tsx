import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardSheet } from "./CardSheet";

const IMAGE = "https://cards.scryfall.io/normal/front/a/b/galvanic-blast.jpg";

function renderSheet(): () => void {
  const onClose = vi.fn();
  render(
    <CardSheet name="Galvanic Blast" imageUrl={IMAGE} onClose={onClose} />,
  );

  return onClose;
}

describe("CardSheet", () => {
  it("opens as a dialog named after the card, with its image and the Close button focused", () => {
    renderSheet();

    const dialog = screen.getByRole("dialog", { name: "Galvanic Blast" });
    expect((dialog as HTMLDialogElement).open).toBe(true);
    expect(
      screen.getByRole("img", { name: "Galvanic Blast" }).getAttribute("src"),
    ).toBe(IMAGE);
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Close" }),
    );
  });

  it("closes on Close", () => {
    const onClose = renderSheet();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a click on the scrim, and not on a click on the card", () => {
    const onClose = renderSheet();

    fireEvent.click(screen.getByRole("img", { name: "Galvanic Blast" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("dialog", { name: "Galvanic Blast" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a click around the card, beside the Close button", () => {
    const onClose = renderSheet();
    const close = screen.getByRole("button", { name: "Close" });

    fireEvent.click(close.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says so when the image does not load", () => {
    renderSheet();

    fireEvent.error(screen.getByRole("img", { name: "Galvanic Blast" }));

    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.getByText("The card's image could not be loaded."),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});
