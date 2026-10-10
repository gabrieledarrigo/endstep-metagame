import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("draws a placeholder of the given size that a screen reader skips", () => {
    const { container } = render(
      <Skeleton className="deck__art" width={140} height="1.3em" />,
    );

    const skeleton = container.firstElementChild as HTMLElement;
    expect(skeleton.getAttribute("aria-hidden")).toBe("true");
    expect(skeleton.className).toBe("skeleton deck__art");
    expect(skeleton.style.width).toBe("140px");
    expect(skeleton.style.height).toBe("1.3em");
  });
});
