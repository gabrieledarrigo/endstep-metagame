import { useEffect } from "react";
import { useLocation } from "react-router";
import { SITE_ORIGIN } from "../config";

const CANONICAL = 'link[rel="canonical"]';
const OG_URL = 'meta[property="og:url"]';

function headTag<Tag extends HTMLElement>(
  selector: string,
  create: () => Tag,
): Tag {
  const found = document.head.querySelector<Tag>(selector);

  if (found) {
    return found;
  }

  const tag = create();
  document.head.append(tag);

  return tag;
}

function createCanonical(): HTMLLinkElement {
  const link = document.createElement("link");
  link.rel = "canonical";

  return link;
}

function createOgUrl(): HTMLMetaElement {
  const meta = document.createElement("meta");
  meta.setAttribute("property", "og:url");

  return meta;
}

function withoutTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

/**
 * Keeps the canonical link and `og:url` in step with the page on the screen, FR-15 and §4.5. The HTML names only the first page, so a browser that shares the page reads them from here.
 *
 * Call it in each page component. On a change of the path, it sets both to the full address of the path, with no query and no trailing slash, and adds them when the HTML has none. A change to the query alone changes nothing.
 *
 * @param path - The page's own path, such as a deck's canonical `/decks/{slug}`, when it differs from the address. `null` on a Not found page, which removes both tags, since a path that does not exist must not name itself. Without it, the address's path.
 */
export function useCanonicalLink(path?: string | null): void {
  const { pathname } = useLocation();
  const page = path === undefined ? pathname : path;

  useEffect(() => {
    if (page === null) {
      document.head.querySelector(CANONICAL)?.remove();
      document.head.querySelector(OG_URL)?.remove();
      return;
    }

    const address = `${SITE_ORIGIN}${withoutTrailingSlash(page)}`;
    const canonical = headTag(CANONICAL, createCanonical);
    const ogUrl = headTag(OG_URL, createOgUrl);

    canonical.href = address;
    ogUrl.content = address;
  }, [page]);
}
