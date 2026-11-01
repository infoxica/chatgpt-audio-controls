export function directionForLocale(locale: string): 'ltr' | 'rtl' {
  return ['ar', 'fa', 'he'].includes(locale.trim().toLowerCase().split(/[-_]/)[0]) ? 'rtl' : 'ltr';
}
