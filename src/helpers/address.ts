/**
 * Writes query parameters as `URLSearchParams` does, but keeps colons and commas readable, as `meta` needs, FR-17.
 *
 * Both characters are allowed in a query, and `URLSearchParams` reads them back the same either way.
 *
 * @param params - The query parameters.
 * @returns The query string without its `?`, such as `window=30d&meta=elves-262fdcbd:3,affinity-e93f5f74:-4`.
 */
export function readableSearch(params: URLSearchParams): string {
  return params.toString().replace(/%3A/gi, ":").replace(/%2C/gi, ",");
}
