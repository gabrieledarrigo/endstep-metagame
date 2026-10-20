import { describe, expect, it } from "vitest";
import { escapeHtml, withMeta, writeHead } from "./head.js";

const PAGE = `<html>
  <head>
    <title>Pauper Endstep metagame</title>
    <meta name="description" content="The site's description." />
    <meta property="og:title" content="Pauper Endstep metagame" />
    <meta property="og:description" content="The site's description." />
    <meta property="og:image" content="https://example.com/card.png" />
  </head>
</html>`;

describe("escapeHtml", () => {
  it("writes each of the five special characters as an entity", () => {
    expect(escapeHtml(`Tom & "Jerry" <it's>`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;it&#39;s&gt;",
    );
  });

  it("leaves other text unchanged", () => {
    expect(escapeHtml("Kuldotha Red · 30d")).toBe("Kuldotha Red · 30d");
  });
});

describe("withMeta", () => {
  it("rewrites the content of the named tag, escaped", () => {
    expect(
      withMeta(PAGE, "property", "og:image", "https://x.test/?a=1&b=2"),
    ).toContain(
      '<meta property="og:image" content="https://x.test/?a=1&amp;b=2" />',
    );
  });

  it("leaves the page unchanged when no tag has that name", () => {
    expect(withMeta(PAGE, "property", "og:url", "https://x.test/")).toBe(PAGE);
  });

  it("writes a replacement pattern in the content as text", () => {
    expect(withMeta(PAGE, "name", "description", "$& and $1")).toContain(
      '<meta name="description" content="$&amp; and $1" />',
    );
  });
});

describe("writeHead", () => {
  const page = writeHead(PAGE, {
    title: `Bogles & "Friends" · Pauper Endstep metagame`,
    description: "<b>12.0%</b> of the field.",
    address: `https://example.com/decks/a?b=1&c="2"`,
  });

  it("writes the title, the description, og:title and og:description, escaped", () => {
    expect(page).toContain(
      "<title>Bogles &amp; &quot;Friends&quot; · Pauper Endstep metagame</title>",
    );
    expect(page).toContain(
      '<meta name="description" content="&lt;b&gt;12.0%&lt;/b&gt; of the field." />',
    );
    expect(page).toContain(
      '<meta property="og:title" content="Bogles &amp; &quot;Friends&quot; · Pauper Endstep metagame" />',
    );
    expect(page).toContain(
      '<meta property="og:description" content="&lt;b&gt;12.0%&lt;/b&gt; of the field." />',
    );
  });

  it("adds the canonical link and og:url before </head>, escaped", () => {
    const address = "https://example.com/decks/a?b=1&amp;c=&quot;2&quot;";

    expect(page).toContain(
      `<link rel="canonical" href="${address}" />\n<meta property="og:url" content="${address}" />\n</head>`,
    );
  });

  it("leaves the image of the site card in place", () => {
    expect(page).toContain(
      '<meta property="og:image" content="https://example.com/card.png" />',
    );
  });
});
