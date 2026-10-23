export const SITE_ORIGIN = "https://pauper-endstep-metagame.vercel.app";
export const SITE_NAME = "Pauper Endstep metagame";

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

type Head = { title: string; description: string; address: string };

type PagePreview = {
  path: string;
  title: string;
  description: string;
  card: string;
};

export const PAGE_PREVIEWS: readonly PagePreview[] = [
  {
    path: "/matchups",
    title: "Matchups",
    description: "How the top 24 Pauper decks do against each other.",
    card: "/matchups-card.png",
  },
  {
    path: "/what-to-play",
    title: "What to play?",
    description:
      "The Pauper deck that does the best against the metagame you expect.",
    card: "/what-to-play-card.png",
  },
  {
    path: "/staples",
    title: "Staples",
    description: "The cards the top 24 Pauper decks play most.",
    card: "/staples-card.png",
  },
];

/**
 * Names a page in its link preview, FR-15.
 *
 * @param name - The page's own name, such as a deck's name or "Staples".
 * @returns The title, such as "Staples · Pauper Endstep metagame".
 */
export function pageTitle(name: string): string {
  return `${name} · ${SITE_NAME}`;
}

/**
 * Escapes text for an HTML element or an attribute value.
 *
 * @param text - Any text.
 * @returns The text with `&`, `<`, `>`, `"` and `'` written as entities.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ENTITIES[character]);
}

/**
 * Replaces the content of one `<meta>` tag in a page.
 *
 * @param html - The page's HTML.
 * @param attribute - The attribute that names the tag, `name` or `property`.
 * @param value - The tag's name, such as `og:title`.
 * @param content - The new content, unescaped.
 * @returns The page with the first matching tag rewritten, or unchanged when no tag matches.
 */
export function withMeta(
  html: string,
  attribute: string,
  value: string,
  content: string,
): string {
  const tag = new RegExp(`<meta\\b[^>]*\\b${attribute}="${value}"[^>]*>`);

  return html.replace(
    tag,
    () => `<meta ${attribute}="${value}" content="${escapeHtml(content)}" />`,
  );
}

/**
 * Writes a page's own link preview into the head of the built `index.html`, FR-15.
 *
 * @param html - The page's HTML.
 * @param head - The title, the description and the full address of the page, all unescaped.
 * @returns The page with the title, the description, `og:title` and `og:description` rewritten, and a canonical link and `og:url` added before `</head>`. Every value is escaped.
 */
export function writeHead(html: string, head: Head): string {
  const address = escapeHtml(head.address);
  let page = html.replace(
    /<title>[^<]*<\/title>/,
    () => `<title>${escapeHtml(head.title)}</title>`,
  );

  page = withMeta(page, "name", "description", head.description);
  page = withMeta(page, "property", "og:title", head.title);
  page = withMeta(page, "property", "og:description", head.description);

  return page.replace(
    "</head>",
    () =>
      `<link rel="canonical" href="${address}" />\n<meta property="og:url" content="${address}" />\n</head>`,
  );
}
