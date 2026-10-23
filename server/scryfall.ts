import { frontOf, nameKey } from "./cards.js";
import { discardBody, isRecord } from "./http.js";
import { type CallLog, outcomeOf } from "./log.js";

export const SCRYFALL_API = "https://api.scryfall.com/";
export const SCRYFALL_COLLECTION = `${SCRYFALL_API}cards/collection`;
export const SCRYFALL_CDN = "https://cards.scryfall.io/";
export const SCRYFALL_PAUSE_MS = 30_000;
export const SCRYFALL_HEADERS: Readonly<Record<string, string>> = {
  "User-Agent":
    "PauperEndstepMetagame/1.0 (+https://github.com/gabrieledarrigo/pauper-endstep-metagame)",
  Accept: "application/json",
  "Content-Type": "application/json",
};

type ScryfallImages = { art_crop?: string };

type ScryfallFace = { name: string; image_uris?: ScryfallImages };

type ScryfallCard = ScryfallFace & { card_faces?: ScryfallFace[] };

const artByName = new Map<string, string | null>();
let pausedUntil = 0;

/**
 * Checks whether a value is a card or a face as Scryfall describes it: a string name, and images with a string art crop when present.
 *
 * @param value - An entry of a collection response's `data`, or one of its faces.
 * @returns `true` when the shape is one `remember` can read.
 */
function isScryfallFace(value: unknown): value is ScryfallFace {
  if (!isRecord(value) || typeof value.name !== "string") {
    return false;
  }

  if (value.image_uris === undefined) {
    return true;
  }

  return (
    isRecord(value.image_uris) &&
    (value.image_uris.art_crop === undefined ||
      typeof value.image_uris.art_crop === "string")
  );
}

/**
 * Checks whether a value is a well-formed card, with its faces well-formed too when it has any.
 *
 * @param value - An entry of a collection response's `data`.
 * @returns `true` when `remember` can read the card.
 */
function isScryfallCard(value: unknown): value is ScryfallCard {
  if (!isRecord(value)) {
    return false;
  }

  const faces = value.card_faces;

  if (
    faces !== undefined &&
    (!Array.isArray(faces) || !faces.every(isScryfallFace))
  ) {
    return false;
  }

  return isScryfallFace(value);
}

/**
 * Keeps an art crop address only when it is on Scryfall's CDN, the one image host besides Endstep that the site's policy allows.
 *
 * @param address - An `art_crop` address from Scryfall, if any.
 * @returns The address, or `null` when it is missing or on another host.
 */
function onCdn(address: string | undefined): string | null {
  if (!address?.startsWith(SCRYFALL_CDN)) {
    return null;
  }

  return address;
}

/**
 * Remembers a name's art crop when the name was asked, the address is on Scryfall's CDN, and no earlier match gave the name an address.
 *
 * @param asked - The memory keys of the names sent to Scryfall.
 * @param name - A card's full name, or one face's name.
 * @param address - The art crop address that goes with that name, if any.
 */
function rememberArt(
  asked: Set<string>,
  name: string,
  address: string | undefined,
): void {
  const key = nameKey(name);
  const art = onCdn(address);

  if (art && asked.has(key) && !artByName.has(key)) {
    artByName.set(key, art);
  }
}

/**
 * Remembers the addresses in a collection response, for the names that were asked, and every other name asked as not found.
 *
 * A card matches a name by its full name or by any face's name, ignoring case. The first match with an art crop on Scryfall's CDN wins, and a later match never replaces it. A face's name takes that face's art crop, or the card's when the faces share one image, as an adventure does. The full name takes the card's art crop, or its first face's. A name that matches no card counts as not found, whether Scryfall lists it in `not_found` or answers with another spelling, such as "Lim-Dûl's Vault" for "Lim-Dul's Vault". So does a card without an art crop on Scryfall's CDN. Its deck falls back to Endstep's endpoint.
 *
 * @param asked - The memory keys of the names sent to Scryfall.
 * @param cards - The cards of Scryfall's collection response.
 */
function remember(asked: Set<string>, cards: ScryfallCard[]): void {
  for (const card of cards) {
    const faces = card.card_faces ?? [];

    rememberArt(
      asked,
      card.name,
      card.image_uris?.art_crop ?? faces[0]?.image_uris?.art_crop,
    );

    for (const face of faces) {
      rememberArt(
        asked,
        face.name,
        face.image_uris?.art_crop ?? card.image_uris?.art_crop,
      );
    }
  }

  for (const key of asked) {
    if (!artByName.has(key)) {
      artByName.set(key, null);
    }
  }
}

/**
 * Asks Scryfall, in one collection request, for the card names this instance has not seen yet.
 *
 * Never retries. After a 429 it sends nothing for 30 seconds, Scryfall's own lockout.
 *
 * @param names - The card names by memory key, each in the spelling Endstep sent.
 * @param boundMs - The longest the collection request can take, in milliseconds.
 * @param calls - Records the request's outcome for the log line, NFR-12.
 * @returns A Promise resolving to `true` when every name has an address or a not-found answer in memory, and `false` when the lookup failed, timed out, met a 429, was paused, or got a body it could not read. A failed lookup stores nothing.
 * @see https://scryfall.com/docs/api/cards/collection
 */
async function lookUpArt(
  names: Map<string, string>,
  boundMs: number,
  calls: CallLog | undefined,
): Promise<boolean> {
  const missing = [...names].filter(([key]) => !artByName.has(key));

  if (missing.length === 0) {
    return true;
  }

  if (Date.now() < pausedUntil) {
    return false;
  }

  let response;

  try {
    response = await fetch(SCRYFALL_COLLECTION, {
      method: "POST",
      headers: SCRYFALL_HEADERS,
      body: JSON.stringify({
        identifiers: missing.map(([, name]) => ({
          name: frontOf(name),
        })),
      }),
      signal: AbortSignal.timeout(boundMs),
    });
  } catch (error) {
    calls?.record("scryfall", outcomeOf(error, false));
    return false;
  }

  if (response.status === 429) {
    pausedUntil = Date.now() + SCRYFALL_PAUSE_MS;
  }

  if (!response.ok) {
    calls?.record("scryfall", response.status);
    await discardBody(response);
    return false;
  }

  let collection: unknown;

  try {
    collection = await response.json();
  } catch (error) {
    calls?.record("scryfall", outcomeOf(error, true));
    return false;
  }

  if (
    !isRecord(collection) ||
    !Array.isArray(collection.data) ||
    !collection.data.every(isScryfallCard)
  ) {
    calls?.record("scryfall", "body");
    return false;
  }

  calls?.record("scryfall", "succeeded");
  remember(new Set(missing.map(([key]) => key)), collection.data);

  return true;
}

/**
 * Finds the art crop of each card name on Scryfall's CDN, §3.4. A warm instance asks Scryfall only for the names it has not seen, in one collection request.
 *
 * @param names - The card names, in the spelling Endstep sent. A name repeated in another case is asked once.
 * @param boundMs - The longest the collection request can take, in milliseconds.
 * @param calls - Records the outcome of the collection request for the log line, NFR-12.
 * @returns A Promise resolving to the address of each name that has one, keyed by the name as given, and whether every name has an address or a not-found answer in memory. `complete` is `false` when the lookup failed, timed out, met a 429, was paused, or got a body it could not read.
 * @see https://scryfall.com/docs/api/cards/collection
 */
export async function findArt(
  names: string[],
  boundMs: number,
  calls?: CallLog,
): Promise<{ art: Map<string, string>; complete: boolean }> {
  const asked = new Map<string, string>();

  for (const name of names) {
    const key = nameKey(name);

    if (!asked.has(key)) {
      asked.set(key, name);
    }
  }

  const complete = await lookUpArt(asked, boundMs, calls);
  const art = new Map<string, string>();

  for (const name of names) {
    const address = artByName.get(nameKey(name));

    if (address) {
      art.set(name, address);
    }
  }

  return { art, complete };
}
