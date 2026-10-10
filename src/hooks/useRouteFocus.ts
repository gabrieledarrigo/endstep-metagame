import { useLayoutEffect, useRef } from "react";
import { NavigationType, useLocation, useNavigationType } from "react-router";

/**
 * Moves focus to the page's main heading when the path changes, so keyboard and screen reader users know the page changed.
 *
 * Call it once, in a component that stays mounted across routes, such as the layout. A link scrolls the new page to the top. Back and forward keep the position the browser restores. The first page keeps the browser's scroll position and focus, and a change to the query string alone, such as another window, moves neither.
 */
export function useRouteFocus(): void {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef(pathname);

  useLayoutEffect(() => {
    const heading = document.querySelector("h1");
    if (previous.current === pathname || !heading) {
      return;
    }

    previous.current = pathname;
    if (navigationType !== NavigationType.Pop) {
      window.scrollTo(0, 0);
    }
    heading.focus({ preventScroll: true });
  }, [pathname, navigationType]);
}
