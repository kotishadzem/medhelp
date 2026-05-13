import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ka from "./locales/ka.json";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGUAGES = ["ka", "en", "de"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
const STORAGE_KEY = "medhelp.language";

function detectDeviceLanguage(): Language {
  try {
    const tag = Localization.getLocales()[0]?.languageCode;
    if (tag && (SUPPORTED_LANGUAGES as readonly string[]).includes(tag)) {
      return tag as Language;
    }
  } catch {
    // ignore
  }
  return "ka";
}

export async function getStoredLanguage(): Promise<Language | null> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v && (SUPPORTED_LANGUAGES as readonly string[]).includes(v)) {
      return v as Language;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function setStoredLanguage(lang: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const stored = await getStoredLanguage();
      const lng: Language = stored ?? detectDeviceLanguage();
      await i18n.use(initReactI18next).init({
        resources: { ka: { translation: ka }, en: { translation: en }, de: { translation: de } },
        lng,
        fallbackLng: "ka",
        interpolation: { escapeValue: false },
        returnNull: false,
        compatibilityJSON: "v4",
      });
    })();
  }
  return initPromise;
}

export async function changeLanguage(lang: Language): Promise<void> {
  await setStoredLanguage(lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
