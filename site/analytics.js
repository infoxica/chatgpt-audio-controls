const measurement = document.body.dataset.ga4;
const storageKey = 'cgpt-audio-website-analytics';
const panel = document.getElementById('consent');
let accepted = false;
let loaded = false;
function remember(value) { try { localStorage.setItem(storageKey, value); } catch (_) {} }
function enable() {
  if (!/^G-[A-Z0-9]+$/.test(measurement || '')) return;
  accepted = true;
  window['ga-disable-' + measurement] = false;
  if (loaded) { window.gtag('consent', 'update', { analytics_storage: 'granted' }); return; }
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  window.gtag('js', new Date());
  window.gtag('config', measurement, { cookie_prefix: 'cgpt_audio', allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + location.pathname, page_referrer: document.referrer ? new URL(document.referrer).origin : '' });
  const script = document.createElement('script'); script.async = true; script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurement; document.head.append(script);
}
function disable() {
  accepted = false;
  window['ga-disable-' + measurement] = true;
  if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (!name.startsWith('cgpt_audio')) continue;
    for (const domain of ['', location.hostname, '.' + location.hostname]) document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' + (domain ? '; domain=' + domain : '');
  }
}
document.getElementById('analytics-accept').addEventListener('click', () => { remember('accepted'); panel.hidden = true; enable(); });
document.getElementById('analytics-decline').addEventListener('click', () => { remember('declined'); disable(); panel.hidden = true; });
document.getElementById('analytics-preferences').addEventListener('click', () => { panel.hidden = false; document.getElementById('analytics-accept').focus(); });
let preference = ''; try { preference = localStorage.getItem(storageKey) || ''; } catch (_) {}
panel.hidden = !!preference;
if (preference === 'accepted') enable();
document.querySelectorAll('a[data-store]').forEach(link => link.addEventListener('click', () => {
  if (accepted && window.gtag) window.gtag('event', 'store_link_click', { store: link.dataset.store, locale: document.documentElement.lang, placement: link.dataset.placement, transport_type: 'beacon' });
}));
document.getElementById('locale').addEventListener('change', event => { location.href = event.target.value; });
