import { useEffect } from "react";
import { useLocation } from "react-router";
import { SITE_ORIGIN } from "../config";

const CANONICAL = 'link[rel="canonical"]';
const OG_URL = 'meta[property="og:url"]';

function canonicalLink(): HTMLLinkElement {
  const found = document.head.querySelector<HTMLLinkElement>(CANONICAL);

  if (found) {
    return found;
  }

  const link = document.createElement("link");
  link.rel = "canonical";
  document.head.append(link);

  return link;
}

function ogUrl(): HTMLMetaElement {
  const found = document.head.querySelector<HTMLMetaElement>(OG_URL);

  if (found) {
    return found;
  }

  const meta = document.createElement("meta");
  meta.setAttribute("property", "og:url");
  document.head.append(meta);

  return meta;
}

/**
 * Keeps the canonical link and `og:url` in step with the page on the screen, FR-15 and §4.5. The HTML names only the first page, so a browser that shares the page reads them from here.
 *
 * Call it in each page component. On a change of the path, it sets both to the full address of the path, with no query, and adds them when the HTML has none. A change to the query alone changes nothing.
 *
 * @param exists - `false` on a Not found page, which removes both tags, since a path that does not exist must not name itself.
 */
export function useCanonicalLink(exists = true): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!exists) {
      document.head.querySelector(CANONICAL)?.remove();
      document.head.querySelector(OG_URL)?.remove();
      return;
    }

    const address = `${SITE_ORIGIN}${pathname}`;
    canonicalLink().href = address;
    ogUrl().content = address;
  }, [exists, pathname]);
}
