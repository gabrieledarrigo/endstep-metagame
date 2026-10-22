import { useTranslation } from "react-i18next";
import { LANGUAGE_KEY, LANGUAGES } from "../locales/i18n";
import "./LanguageSwitch.css";

export function LanguageSwitch() {
  const { t, i18n } = useTranslation();

  if (LANGUAGES.length < 2) {
    return null;
  }

  const choose = (next: string): void => {
    i18n.changeLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      return;
    }
  };

  return (
    <label className="lang-switch">
      <span className="lang-switch__code" aria-hidden="true">
        {i18n.language.toUpperCase()}
      </span>
      <svg
        className="lang-switch__chevron"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" />
      </svg>
      <select
        className="lang-switch__select"
        aria-label={t("components.languageSwitch.label")}
        value={i18n.language}
        onChange={(event) => choose(event.target.value)}
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {i18n.getFixedT(code)("components.languageSwitch.name")}
          </option>
        ))}
      </select>
    </label>
  );
}
