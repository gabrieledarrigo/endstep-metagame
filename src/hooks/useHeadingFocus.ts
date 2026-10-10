import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keeps keyboard focus on the page's main heading when a change of state replaces it, as when a page finishes loading.
 *
 * Without it, focus falls back to the document and a screen reader loses its place. Focus that the reader moved away from the heading stays where they put it.
 *
 * @param state - A value that changes whenever the page may render a different main heading.
 */
export function useHeadingFocus(state: string): void {
  const headingHadFocus = useRef(false);

  useEffect(() => {
    const record = (): void => {
      headingHadFocus.current = document.activeElement?.tagName === "H1";
    };
    const leave = (event: FocusEvent): void => {
      const left = event.target;

      if (!(left instanceof HTMLElement) || left.tagName !== "H1") {
        return;
      }

      queueMicrotask(() => {
        if (left.isConnected && document.activeElement === document.body) {
          headingHadFocus.current = false;
        }
      });
    };

    record();
    document.addEventListener("focusin", record);
    document.addEventListener("focusout", leave);

    return (): void => {
      document.removeEventListener("focusin", record);
      document.removeEventListener("focusout", leave);
    };
  }, []);

  useLayoutEffect(() => {
    const heading = document.querySelector<HTMLElement>("h1");
    const focusLost =
      document.activeElement === null ||
      document.activeElement === document.body;

    if (headingHadFocus.current && heading && focusLost) {
      heading.focus({ preventScroll: true });
    }
  }, [state]);
}
