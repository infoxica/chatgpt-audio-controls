/** Additional UI locales observed in ChatGPT settings on 2026-11-02.
 * UI coverage is independent of the browser's manifest/store locale support.
 */
export const additionalLanguages = [
  { code: 'am', label: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'bg', label: 'Bulgarian', nativeName: 'Български' },
  { code: 'bs', label: 'Bosnian', nativeName: 'Bosanski' },
  { code: 'da', label: 'Danish', nativeName: 'Dansk' },
  { code: 'et', label: 'Estonian', nativeName: 'Eesti' },
  { code: 'fil', label: 'Filipino', nativeName: 'Filipino' },
  { code: 'fi', label: 'Finnish', nativeName: 'Suomi' },
  { code: 'gu', label: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'hr', label: 'Croatian', nativeName: 'Hrvatski' },
  { code: 'hy', label: 'Armenian', nativeName: 'Հայերեն' },
  { code: 'is', label: 'Icelandic', nativeName: 'Íslenska' },
  { code: 'ka', label: 'Georgian', nativeName: 'ქართული' },
  { code: 'kk', label: 'Kazakh', nativeName: 'Қазақ тілі' },
  { code: 'kn', label: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'lt', label: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'lv', label: 'Latvian', nativeName: 'Latviešu' },
  { code: 'mk', label: 'Macedonian', nativeName: 'Македонски' },
  { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mn', label: 'Mongolian', nativeName: 'Монгол' },
  { code: 'ms', label: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'my', label: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'nl', label: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pa', label: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'sk', label: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', label: 'Slovenian', nativeName: 'Slovenščina' },
  { code: 'so', label: 'Somali', nativeName: 'Soomaali' },
  { code: 'sq', label: 'Albanian', nativeName: 'Shqip' },
  { code: 'sr', label: 'Serbian', nativeName: 'Српски' },
  { code: 'sw', label: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'ur', label: 'Urdu', nativeName: 'اردو' },
  { code: 'es-419', label: 'Spanish (Latin America)', nativeName: 'Español (Latinoamérica)' },
  { code: 'fr-CA', label: 'French (Canada)', nativeName: 'Français (Canada)' },
  { code: 'hi-Latn', label: 'Hindi (Latin)', nativeName: 'Hindi (Latin)' },
  { code: 'zh-HK', label: 'Chinese (Traditional, Hong Kong)', nativeName: '繁體中文（香港）' },
] as const;
export type AdditionalLanguage = typeof additionalLanguages[number]['code'];

const chromeLocales = new Set('ar am bg bn ca cs da de el en es es_419 et fa fi fil fr gu he hi hr hu id it ja kn ko lt lv ml mr ms nl no pl pt_BR pt_PT ro ru sk sl sr sv sw ta te th tr uk vi zh_CN zh_TW'.split(' '));
/** Null means custom UI translation only; browser-owned strings use its fallback. */
export function manifestLocale(code: string): string | null {
  const value = code === 'nb' ? 'no' : code.replaceAll('-', '_');
  return chromeLocales.has(value) ? value : null;
}
