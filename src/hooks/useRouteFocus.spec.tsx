import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteFocus } from "./useRouteFocus";

function Page({ title }: { title: string }) {
  const navigate = useNavigate();
  useRouteFocus();

  return (
    <>
      <h1 tabIndex={-1}>{title}</h1>
      <Link to="/matchups">Matchups</Link>
      <Link to="/?window=7d">Same page, another window</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Page title="Overview" />} />
        <Route path="/matchups" element={<Page title="Matchups" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("useRouteFocus", () => {
  beforeEach(() => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("leaves focus and scroll alone on the first page", () => {
    renderAt("/");

    expect(document.activeElement).toBe(document.body);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls to the top and focuses the new page's heading when the path changes", () => {
    renderAt("/");

    fireEvent.click(screen.getByRole("link", { name: "Matchups" }));

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Matchups" }),
    );
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("keeps the browser's scroll position on back, and focuses the heading", () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "Matchups" }));
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Overview" }),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing when only the query string changes", () => {
    renderAt("/");

    fireEvent.click(
      screen.getByRole("link", { name: "Same page, another window" }),
    );

    expect(document.activeElement).not.toBe(
      screen.getByRole("heading", { name: "Overview" }),
    );
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
