import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import etCommon from "../../locales/et/common.json";
import ruCommon from "../../locales/ru/common.json";
import enCommon from "../../locales/en/common.json";
import { DEFAULT_LOCALE } from "./types";

i18n.use(initReactI18next).init({
  resources: {
    et: { common: etCommon },
    ru: { common: ruCommon },
    en: { common: enCommon },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  ns: ["common"],
  defaultNS: "common",
  saveMissing: true,
  saveMissingTo: "all",
  missingKeyHandler: (lng, ns, key) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[i18n] Missing key: ${ns}:${key} (lng=${lng})`);
    }
  },
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLocale(locale: string) {
  return i18n.changeLanguage(locale);
}

export default i18n;
