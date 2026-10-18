import page from "../index.html?raw";

/**
 * Appends copies of the two `theme-color` metas from `index.html` to the document's head, as the page carries them. Remove them after each test.
 *
 * @returns The appended metas, in the page's order.
 */
export function addThemeColours(): HTMLMetaElement[] {
  const head = new DOMParser().parseFromString(page, "text/html").head;
  const metas = [
    ...head.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  ].map((meta) => meta.cloneNode() as HTMLMetaElement);
  document.head.append(...metas);

  return metas;
}
