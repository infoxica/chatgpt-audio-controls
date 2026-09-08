declare global {
  interface Window {
    dataLayer?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

export const consentKey = 'cgpt-audio-website-analytics';
let accepted = false;
let loaded = false;

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
  target.gtag = (...args) => { target.dataLayer!.push(args); };
  target.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  target.gtag('js', new Date());
  target.gtag('config', measurement, {
    cookie_prefix: 'cgpt_audio', allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: location.origin + location.pathname,
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
  if (!accepted || !link) return;
  window.gtag?.('event', 'store_link_click', {
    store: link.dataset.store, locale: document.documentElement.lang,
    placement: link.dataset.placement, transport_type: 'beacon',
  });
}
