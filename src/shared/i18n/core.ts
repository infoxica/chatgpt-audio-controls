import { hi } from "./locales/hi";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { id } from "./locales/id";
import { it } from "./locales/it";
import { tr } from "./locales/tr";
import { SupportedLanguage } from "../types";
import { TranslationSchema } from "./types";
import { en } from "./locales/en";
import { zhCN } from "./locales/zh-CN";
import { zhTW } from "./locales/zh-TW";
import { vi } from "./locales/vi";
import { th } from "./locales/th";
import { es } from "./locales/es";
import { ptBR } from "./locales/pt-BR";
import { ptPT } from "./locales/pt-PT";
import { ru } from "./locales/ru";

export * from "./types";
export { en, zhCN, zhTW, vi, th, es, ptBR, ptPT, ru };

export type ResolvedLanguage = Exclude<SupportedLanguage, "auto">;

export const LOCALES: Record<ResolvedLanguage, TranslationSchema> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  vi,
  th,
  es,
  "pt-BR": ptBR,
  "pt-PT": ptPT,
  ru,
  hi,
  fr,
  de,
  ja,
  ko,
  id,
  it,
  tr,
};

/**
 * Detects the user's browser language with accurate regional variant matching.
 */
export function detectBrowserLanguage(): ResolvedLanguage {
  const candidates: string[] = [];

  if (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
    try {
      const chromeLang = chrome.i18n.getUILanguage();
      if (chromeLang) candidates.push(chromeLang);
    } catch (_) {}
  }

  if (typeof navigator !== "undefined") {
    if (Array.isArray(navigator.languages)) {
      candidates.push(...navigator.languages);
    }
    if (navigator.language) {
      candidates.push(navigator.language);
    }
  }

  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue;
    const tag = raw.toLowerCase().trim();

    const base = tag.split("-")[0];
    if (["hi", "fr", "de", "ja", "ko", "id", "it", "tr"].includes(base)) return base as ResolvedLanguage;

    // Traditional Chinese variants (Taiwan, Hong Kong, Macau, Hant)
    if (
      tag === "zh-tw" ||
      tag === "zh-hk" ||
      tag === "zh-mo" ||
      tag.includes("zh-hant") ||
      tag.startsWith("zh-tw-") ||
      tag.startsWith("zh-hk-")
    ) {
      return "zh-TW";
    }

    // Simplified Chinese variants (Mainland China, Singapore, Hans) or generic Chinese
    if (tag.startsWith("zh")) {
      return "zh-CN";
    }

    // European Portuguese
    if (tag === "pt-pt" || tag.startsWith("pt-pt-")) {
      return "pt-PT";
    }

    // Brazilian / Generic Portuguese
    if (tag.startsWith("pt")) {
      return "pt-BR";
    }

    // Vietnamese
    if (tag.startsWith("vi")) {
      return "vi";
    }

    // Thai
    if (tag.startsWith("th")) {
      return "th";
    }

    // Spanish
    if (tag.startsWith("es")) {
      return "es";
    }

    // Russian
    if (tag.startsWith("ru")) {
      return "ru";
    }

    // English
    if (tag.startsWith("en")) {
      return "en";
    }
  }

  return "en";
}

/**
 * Resolves the active language based on user settings ("auto" or explicit language code).
 */
export function resolveLanguage(lang?: SupportedLanguage | string): ResolvedLanguage {
  if (!lang || lang === "auto" || !Object.hasOwn(LOCALES, lang)) {
    return detectBrowserLanguage();
  }
  return lang as ResolvedLanguage;
}

/**
 * Retrieves the translation schema for the specified language setting.
 */
export function getTranslations(lang?: SupportedLanguage | string): TranslationSchema {
  const resolved = resolveLanguage(lang);
  return LOCALES[resolved] || en;
}
