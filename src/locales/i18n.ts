import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import locales from "./locales.json";

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

i18next.use(initReactI18next).init({
  resources: locales satisfies Locales,
  lng: "en",
  fallbackLng: "en",
  initAsync: false,
  interpolation: { escapeValue: false },
});
