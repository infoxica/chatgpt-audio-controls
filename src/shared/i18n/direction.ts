export function directionForLocale(locale: string): 'ltr' | 'rtl' {
  return ['ar', 'fa', 'he', 'ur'].includes(locale.trim().toLowerCase().split(/[-_]/)[0]) ? 'rtl' : 'ltr';
}
