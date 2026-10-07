import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";
import { storage, type Lang } from "../lib/storage";

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
  lng: storage.getLanguage() ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
}

export function changeLanguage(lang: Lang) {
  storage.setLanguage(lang);
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
