import config from '../../config/release.json';
import { resolveLanguage } from './i18n/core';
import { EXTENSION_VERSION } from './constants';

// Public, fixed campaign labels only. This link never transmits extension usage.
export function websiteURL(language: string, placement: 'sidebar' | 'popup'): string {
  const locale = resolveLanguage(language);
  const url = new URL(locale === 'en' ? '' : locale + '/', config.siteUrl);
  url.search = new URLSearchParams({ utm_source: 'extension', utm_medium: 'referral', utm_campaign: 'v' + EXTENSION_VERSION, utm_content: placement }).toString();
  return url.toString();
}
