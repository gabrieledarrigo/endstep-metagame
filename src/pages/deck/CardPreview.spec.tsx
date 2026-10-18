import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardPreview } from "./CardPreview";

const IMAGE = "https://cards.scryfall.io/normal/front/a/b/galvanic-blast.jpg";

function element(top: () => number, left: number, width: number): HTMLElement {
  const box = document.createElement("div");
  box.getBoundingClientRect = (): DOMRect =>
    DOMRect.fromRect({ x: left, y: top(), width, height: 20 });
  document.body.append(box);

  return box;
}

function renderPreview(nameTop: () => number): {
  onHide: () => void;
  preview: HTMLElement;
} {
  const onHide = vi.fn();
  const name = element(nameTop, 940, 120);
  const panel = { current: element(() => 100, 920, 300) };

  render(
    <CardPreview imageUrl={IMAGE} name={name} panel={panel} onHide={onHide} />,
  );

  const [image] = screen.getAllByRole("presentation", { hidden: true });

  return { onHide, preview: image.parentElement as HTMLElement };
}

beforeEach(() => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    1280,
  );
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
    800,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CardPreview", () => {
  it("shows the card's image, hidden from assistive technology, left of the panel and level with the name", () => {
    const { preview } = renderPreview(() => 300);

    expect(preview.getAttribute("aria-hidden")).toBe("true");
    expect(preview.querySelector("img")?.getAttribute("src")).toBe(IMAGE);
    expect([preview.style.left, preview.style.top]).toEqual(["660px", "300px"]);
  });

  it("follows its name when the page scrolls, and hides once the name leaves the window", () => {
    let top = 300;

    const { onHide, preview } = renderPreview(() => top);

    top = 200;
    fireEvent.scroll(window);
    expect(preview.style.top).toBe("200px");
    expect(onHide).not.toHaveBeenCalled();

    top = -40;
    fireEvent.scroll(window);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("waits for a name that focus has yet to scroll into the window, and hides only once it leaves again", () => {
    let top = 1200;

    const { onHide, preview } = renderPreview(() => top);

    expect(onHide).not.toHaveBeenCalled();
    expect(preview.style.visibility).toBe("hidden");

    top = 400;
    fireEvent.scroll(window);
    expect([preview.style.visibility, preview.style.top]).toEqual([
      "",
      "400px",
    ]);

    top = 900;
    fireEvent.scroll(window);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("places the card again on the next frame", () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback);

      return frames.length;
    });
    let top = 1200;

    const { preview } = renderPreview(() => top);

    top = 250;
    frames.forEach((callback) => callback(0));
    expect([preview.style.visibility, preview.style.top]).toEqual([
      "",
      "250px",
    ]);
  });

  it("hides on Escape, and on no other key", () => {
    const { onHide } = renderPreview(() => 300);

    act(() => {
      fireEvent.keyDown(document, { key: "Tab" });
    });
    expect(onHide).not.toHaveBeenCalled();

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
