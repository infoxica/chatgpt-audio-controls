declare global {
  interface Window {
    dataLayer?: (IArguments | unknown[])[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export const consentKey = 'cgpt-audio-website-analytics';
let accepted = false;
let loaded = false;

// Attribution must never forward arbitrary URL parameters, emails or chat text.
export function analyticsLocation(href: string): string {
  const url = new URL(href), clean = new URL(url.origin + url.pathname);
  const allowed: Record<string, string[]> = {
    utm_source: ['official_website', 'extension', 'ext_sidebar', 'ext_app_menu', 'github', 'chrome_web_store', 'edge_addons'],
    utm_medium: ['referral', 'extension', 'organic'],
    utm_campaign: ['extension', 'v1.4.0', 'v1.4.1'],
    utm_content: ['sidebar', 'app_menu', 'popup', 'options', 'listing', 'readme'],
  };
  for (const [key, values] of Object.entries(allowed)) {
    const value = url.searchParams.get(key);
    if (value && values.includes(value)) clean.searchParams.set(key, value);
  }
  return clean.toString();
}

export function enableAnalytics() {
  const measurement = document.body.dataset.ga4;
  if (!measurement || !/^G-[A-Z0-9]+$/.test(measurement)) return;
  const target = window;
  accepted = true;
  target[`ga-disable-${measurement}`] = false;
  if (loaded) {
    target.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  loaded = true;
  target.dataLayer ||= [];
  // gtag consumes Arguments objects; ordinary arrays are not command records.
  target.gtag = function (..._args: unknown[]) { target.dataLayer!.push(arguments); };
  target.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  target.gtag('js', new Date());
  target.gtag('config', measurement, {
    cookie_prefix: 'cgpt_audio', allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: analyticsLocation(location.href),
    page_referrer: document.referrer ? new URL(document.referrer).origin : '',
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurement;
  document.head.append(script);
}

export function disableAnalytics() {
  accepted = false;
  const target = window;
  target[`ga-disable-${document.body.dataset.ga4}`] = true;
  target.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!name.startsWith('cgpt_audio')) continue;
    for (const domain of ['', location.hostname, '.' + location.hostname]) {
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
    }
  }
}

export function trackStoreClick(event: MouseEvent) {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-store]') : null;
  if (!accepted || !link || !['chrome', 'edge'].includes(link.dataset.store || '')) return;
  window.gtag?.('event', 'store_link_click', {
    store: link.dataset.store, locale: document.documentElement.lang,
    placement: link.dataset.placement, transport_type: 'beacon',
  });
}

/** Website clicks only: opening a provider is not evidence of a payment. */
export function trackSupportClick(event: MouseEvent) {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-support-provider]') : null;
  if (!accepted || !link || link.dataset.supportProvider !== 'paypal' || link.dataset.supportPlacement !== 'support') return;
  const amount = Number(link.dataset.supportAmount);
  if (![1, 3, 5, 10].includes(amount) || link.href !== `https://paypal.me/infoxica/${amount}USD`) return;
  window.gtag?.('event', 'support_link_click', {
    provider: 'paypal', amount, currency: 'USD', locale: document.documentElement.lang, placement: 'support', transport_type: 'beacon',
  });
}
