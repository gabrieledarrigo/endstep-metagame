import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Keeps keyboard focus on the page's main heading when a change of state replaces the heading, as when a page finishes loading. Without it, focus falls back to the document and a screen reader loses its place.
 *
 * @param state - A value that changes whenever the page may render a different main heading.
 */
export function useHeadingFocus(state: string): void {
  const headingHadFocus = useRef(false);

  useEffect(() => {
    const record = (): void => {
      headingHadFocus.current = document.activeElement?.tagName === "H1";
    };

    record();
    document.addEventListener("focusin", record);

    return (): void => document.removeEventListener("focusin", record);
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
