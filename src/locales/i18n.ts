import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { formatTag, preferredLanguage } from "../helpers";
import locales from "./locales.json";

export const LANGUAGE_KEY = "language";
export const LANGUAGES = Object.keys(locales);

type Strings<Source> = {
  [Key in keyof Source]: Source[Key] extends string
    ? string
    : Strings<Source[Key]>;
};

export type Translation = Strings<(typeof locales)["en"]["translation"]>;

export type Locales = Record<string, { translation: Translation }>;

declare module "i18next" {
  interface CustomTypeOptions {
    resources: (typeof locales)["en"];
  }
}

function storedLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

function firstLanguage(): string {
  const stored = storedLanguage();

  if (stored !== null && LANGUAGES.includes(stored)) {
    return stored;
  }

  return preferredLanguage(LANGUAGES);
}

i18next.on("languageChanged", (language) => {
  document.documentElement.lang = formatTag(language);
});

i18next.use(initReactI18next).init({
  resources: locales satisfies Locales,
  lng: firstLanguage(),
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
});
