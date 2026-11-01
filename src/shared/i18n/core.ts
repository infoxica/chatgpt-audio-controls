import { directionForLocale } from './direction';
import audienceLocales from './locales/audience.json';
import { expandedLocales } from './locales/expanded';
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
  ...audienceLocales,
  ...expandedLocales,
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

/** Match both browser tags and Chrome catalog codes without changing stored preferences. */
function matchLocale(raw: string | undefined): ResolvedLanguage | undefined {
  if (typeof raw !== 'string') return undefined;
  const [base, ...subtags] = raw.trim().replaceAll('_', '-').toLowerCase().split('-');
  if (base === 'zh') {
    // An explicit script takes precedence over region (e.g. zh-Hans-HK).
    if (subtags.includes('hant')) return 'zh-TW';
    if (subtags.includes('hans')) return 'zh-CN';
    return subtags.some(tag => ['tw', 'hk', 'mo'].includes(tag)) ? 'zh-TW' : 'zh-CN';
  }
  if (base === 'pt') return subtags.includes('pt') ? 'pt-PT' : 'pt-BR';
  if (base === 'no') return 'nb';
  return Object.hasOwn(LOCALES, base) ? base as ResolvedLanguage : undefined;
}

/** Detect the browser UI language, then supported preferred languages, then English. */
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
    const matched = matchLocale(raw);
    if (matched) return matched;
  }

  return "en";
}

/**
 * Resolves the active language based on user settings ("auto" or explicit language code).
 */
export function resolveLanguage(lang?: SupportedLanguage | string): ResolvedLanguage {
  return matchLocale(lang) || detectBrowserLanguage();
}

/**
 * Retrieves the translation schema for the specified language setting.
 */
export function getTranslations(lang?: SupportedLanguage | string): TranslationSchema {
  const resolved = resolveLanguage(lang);
  return LOCALES[resolved] || en;
}

export function languageDirection(language?: string): 'ltr' | 'rtl' { return directionForLocale(resolveLanguage(language)); }
