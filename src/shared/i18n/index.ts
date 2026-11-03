import { useMemo, useEffect } from "react";
import { SupportedLanguage } from "../types";
import { detectBrowserLanguage, resolveLanguage, languageDirection, LOCALES, en } from "./core";
export * from "./core";

/**
 * React hook for consuming translations reactively based on extension settings.
 */
export function useTranslation(languageSetting: SupportedLanguage = "auto") {
  useEffect(() => {
    document.documentElement.lang = resolveLanguage(languageSetting);
    document.documentElement.dir = languageDirection(languageSetting);
  }, [languageSetting]);
  return useMemo(() => {
    const detectedLang = detectBrowserLanguage();
    const resolvedLang = resolveLanguage(languageSetting);
    const t = LOCALES[resolvedLang] || en;

    return {
      t,
      currentSetting: languageSetting,
      resolvedLang,
      detectedLang,
    };
  }, [languageSetting]);
}
