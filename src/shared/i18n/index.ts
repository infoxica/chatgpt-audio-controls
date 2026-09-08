import { useMemo } from "react";
import { SupportedLanguage } from "../types";
import { detectBrowserLanguage, resolveLanguage, LOCALES, en } from "./core";
export * from "./core";

/**
 * React hook for consuming translations reactively based on extension settings.
 */
export function useTranslation(languageSetting: SupportedLanguage = "auto") {
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
