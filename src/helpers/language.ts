const DEFAULT_LANGUAGE = "en";

const DEFAULT_TAGS: Readonly<Record<string, string>> = {
  en: "en-GB",
  it: "it-IT",
  es: "es-ES",
  pt: "pt-BR",
};

function primaryCode(tag: string): string {
  return tag.split("-")[0].toLowerCase();
}

function preferredTags(): readonly string[] {
  const { languages, language } = window.navigator;

  if (languages !== undefined && languages.length > 0) {
    return languages;
  }

  return language ? [language] : [];
}

/**
 * Picks the language of a first visit from the browser's preferred languages, FR-20.
 *
 * @param available - The languages of the file, such as `en` and `pt`.
 * @returns The first preferred language whose primary code is available, so `pt-PT` gives `pt`, or `en` when none is.
 */
export function preferredLanguage(available: readonly string[]): string {
  return (
    preferredTags()
      .map(primaryCode)
      .find((code) => available.includes(code)) ?? DEFAULT_LANGUAGE
  );
}

/**
 * Finds the full tag of the formats for a language, FR-20: the browser's own region when it prefers that language.
 *
 * @param language - A language of the file, such as `pt`.
 * @returns The first preferred tag with the same primary code, such as `en-US`, or `en-GB`, `it-IT`, `es-ES` or `pt-BR` when the browser has none.
 */
export function formatTag(language: string): string {
  return (
    preferredTags().find((tag) => primaryCode(tag) === language) ??
    DEFAULT_TAGS[language] ??
    DEFAULT_TAGS[DEFAULT_LANGUAGE]
  );
}
