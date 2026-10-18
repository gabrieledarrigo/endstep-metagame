import { useEffect, useState, useSyncExternalStore } from "react";
import "./ThemeToggle.css";

type Theme = "light" | "dark";

const DARK_DEVICE = "(prefers-color-scheme: dark)";
const THEME_KEY = "theme";
const THEME_COLOURS: Record<Theme, string> = {
  light: "#f9f9f7",
  dark: "#353537",
};

function subscribeToDevice(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_DEVICE);
  query.addEventListener("change", onChange);

  return (): void => {
    query.removeEventListener("change", onChange);
  };
}

function deviceIsDark(): boolean {
  return window.matchMedia(DARK_DEVICE).matches;
}

function chosenTheme(): Theme | null {
  const theme = document.documentElement.dataset.theme;
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const deviceDark = useSyncExternalStore(subscribeToDevice, deviceIsDark);
  const [chosen, setChosen] = useState(chosenTheme);
  const dark = chosen === null ? deviceDark : chosen === "dark";

  useEffect(() => {
    const colour = dark ? THEME_COLOURS.dark : THEME_COLOURS.light;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.content = colour;
      });
  }, [dark]);

  const toggle = (): void => {
    const next = dark ? "light" : "dark";
    setChosen(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      return;
    }
  };

  return (
    <button
      type="button"
      className={["theme-toggle", className].filter(Boolean).join(" ")}
      aria-label="Dark theme"
      aria-pressed={dark}
      onClick={toggle}
    >
      {dark ? (
        <svg
          className="theme-toggle__icon theme-toggle__icon--moon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      ) : (
        <svg
          className="theme-toggle__icon theme-toggle__icon--sun"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      )}
    </button>
  );
}
