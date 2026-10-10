import { fireEvent, render, screen } from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRouteFocus } from "./useRouteFocus";

function Shell() {
  const navigate = useNavigate();
  useRouteFocus();

  return (
    <>
      <Link to="/matchups">Matchups</Link>
      <Link to="/?window=7d">Same page, another window</Link>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <Outlet />
    </>
  );
}

function Overview() {
  return <h1 tabIndex={-1}>Overview</h1>;
}

function Matchups() {
  return <h1 tabIndex={-1}>Matchups</h1>;
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/matchups" element={<Matchups />} />
        </Route>
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
