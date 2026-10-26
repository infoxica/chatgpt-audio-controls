import config from '../../config/release.json';
import { EXTENSION_VERSION } from './constants';
import { resolveLanguage } from './i18n/core';

export function validFeedbackURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && /^chatgpt-audio-feedback\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)
      && url.pathname === '/feedback' && !url.search && !url.hash;
  } catch { return false; }
}
export function feedbackURL(language: string, source: 'installed' | 'uninstall', os?: string): string {
  if (!validFeedbackURL(config.feedbackUrl)) return '';
  const url = new URL(config.feedbackUrl);
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  url.searchParams.set('source', source);
  url.searchParams.set('lang', resolveLanguage(language));
  url.searchParams.set('version', EXTENSION_VERSION);
  url.searchParams.set('browser', /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chromium' : 'Other');
  url.searchParams.set('os', os || (/Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other'));
  return url.toString();
}
