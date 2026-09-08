import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { releaseLocales } from '../src/shared/i18n/release-copy';
import { LOCALES } from '../src/shared/i18n/core';
import { SUPPORTED_LANGUAGES } from '../src/shared/constants';
import config from '../config/release.json';

const root = config.siteUrl;
const path = new URL(root).pathname;
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const localeUrl = (code: string) => root + (code === 'en' ? '' : code + '/');
const chromeUrl = 'https://chromewebstore.google.com/detail/aifalimlfgiepmbejcemcofninobaiea/';
const edgeUrl = 'https://microsoftedge.microsoft.com/addons/detail/chatgpt-audio-controls-/cmhbacgmcgiolpidfjcpefkhbbeamemf';
const alternatives = Object.keys(LOCALES).map(code => `<link rel="alternate" hreflang="${code}" href="${localeUrl(code)}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${root}">`;
mkdirSync('site-dist/assets', { recursive: true });
copyFileSync('site/site.css', 'site-dist/assets/site.css');
copyFileSync('site/analytics.js', 'site-dist/assets/analytics.js');
copyFileSync('public/icons/icon-128.png', 'site-dist/assets/icon.png');
copyFileSync('assets/store/screenshots/01-active-read-aloud-1280x800.png', 'site-dist/assets/player.png');
for (const [code, base] of Object.entries(LOCALES)) {
  const c = releaseLocales[code];
  if (!c) throw new Error(`Missing website translation ${code}`);
  const url = localeUrl(code);
  const directory = `site-dist/${code === 'en' ? '' : code}`;
  mkdirSync(directory, { recursive: true });
  const install = (placement: string) => `<div class="links">${(['chrome', 'edge'] as const).map(store => {
    const target = new URL(store === 'chrome' ? chromeUrl : edgeUrl);
    target.search = new URLSearchParams({ utm_source: 'official_website', utm_medium: 'referral', utm_campaign: 'extension', utm_content: `${code}_${placement}` }).toString();
    return `<a class="button ${store === 'edge' ? 'secondary' : ''}" data-store="${store}" data-placement="${placement}" href="${escape(target.toString())}">${escape(c[store])} ↗</a>`;
  }).join('')}</div>`;
  const features = [[base.content.shortcutsPopover.playPause, base.shortcuts.playPause.description], [base.content.tooltips.speed, base.options.general.speedDesc], [base.content.tooltips.download, c.sourceFormat]];
  const shortcutRows = [[base.shortcuts.playPause.action, 'Space / K · Alt+P', 'Space / K · Option ⌥+P'], [base.shortcuts.seekBack.action, 'Alt+←', 'Option ⌥+←'], [base.shortcuts.seekForward.action, 'Alt+→', 'Option ⌥+→'], [base.shortcuts.speedDecrease.action, 'Shift+,', 'Shift ⇧+,'], [base.shortcuts.speedIncrease.action, 'Shift+.', 'Shift ⇧+.']];
  const schema = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'ChatGPT Audio Controls', applicationCategory: 'BrowserApplication', operatingSystem: 'Windows, macOS, Linux, ChromeOS', isAccessibleForFree: true, url, description: c.siteIntro, image: root + 'assets/player.png', author: { '@type': 'Organization', name: 'Infoxica' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } };
  const html = `<!doctype html><html lang="${code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(c.siteTitle)} | ChatGPT Audio Controls</title><meta name="description" content="${escape(c.siteIntro)}"><link rel="canonical" href="${url}">${alternatives}<meta property="og:type" content="website"><meta property="og:title" content="${escape(c.siteTitle)}"><meta property="og:description" content="${escape(c.siteIntro)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${root}assets/player.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${path}assets/icon.png"><link rel="stylesheet" href="${path}assets/site.css"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script><script defer src="${path}assets/analytics.js"></script></head><body data-ga4="${escape(config.websiteGa4Id)}">
  <a class="skip" href="#main">${escape(c.features)}</a><header class="top"><a class="brand" href="${url}"><img src="${path}assets/icon.png" alt="" width="42" height="42">ChatGPT<br>Audio Controls</a><nav><a href="#setup">${escape(c.setup)}</a><a href="#help">${escape(c.help)}</a><label><span class="small">${escape(c.language)} </span><select id="locale">${SUPPORTED_LANGUAGES.filter(item => item.code !== 'auto').map(item => `<option value="${localeUrl(item.code)}" ${item.code === code ? 'selected' : ''}>${escape(item.nativeName)}</option>`).join('')}</select></label></nav></header>
  <main id="main"><section class="hero"><div><div class="eyebrow">ChatGPT Audio Controls · Infoxica</div><h1>${escape(c.siteTitle)}</h1><p class="intro">${escape(c.siteIntro)}</p>${install('hero')}<p class="small">${escape(c.desktop)} ${escape(c.available)}</p></div><div class="hero-art" aria-hidden="true"><img src="${path}assets/icon.png" alt="" width="148" height="148"><div class="sound">${'<i></i>'.repeat(19)}</div><span>0.5× &nbsp; 1× &nbsp; 1.5× &nbsp; 2×</span></div></section>
  <figure><img src="${path}assets/player.png" alt="${escape(c.screenshot)}" width="1280" height="800" fetchpriority="high"><figcaption class="small">${escape(c.screenshot)}</figcaption></figure>
  <section class="section"><h2>${escape(c.features)}</h2><div class="features">${features.map(([title, body], index) => `<article><span class="number">0${index + 1}</span><h3>${escape(title)}</h3><p>${escape(body)}</p></article>`).join('')}</div></section>
  <section class="section reading" id="setup"><h2>${escape(c.setup)}</h2><ol>${[c.stepInstall,c.stepRead,c.stepControl].map(step=>`<li>${escape(step)}</li>`).join('')}</ol><h3>${escape(base.popup.shortcuts.title)}</h3><table><thead><tr><th>${escape(base.popup.tabs.controls)}</th><th>Windows / Linux</th><th>macOS</th></tr></thead><tbody>${shortcutRows.map(([label, windows, mac])=>`<tr><td>${escape(label)}</td><td><kbd>${escape(windows)}</kbd></td><td><kbd>${escape(mac)}</kbd></td></tr>`).join('')}</tbody></table></section>
  <section class="section reading" id="help"><h2>${escape(c.help)}</h2>${[[base.options.faq.q3,c.sourceFormat],[base.options.faq.q6,c.privacyBody],[base.content.tooltips.readAloud,c.nativeHelp],[base.content.tooltips.playPause,c.playError]].map(([q,a])=>`<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}<p><a href="https://github.com/infoxica/chatgpt-audio-controls/issues">${escape(base.popup.about.reportIssue)} ↗</a></p></section>
  <section class="section reading" id="privacy"><h2>${escape(c.privacy)}</h2><p>${escape(c.privacyBody)}</p><p>${escape(c.websitePrivacy)}</p><p>${escape(c.feedbackPolicy)}</p></section><section class="section"><h2>${escape(c.quickStart)}</h2>${install('footer')}</section></main>
  <footer><p>${escape(c.independent)}</p><div class="links"><a href="https://github.com/infoxica/chatgpt-audio-controls">${escape(base.popup.about.githubRepo)}</a><a href="#privacy">${escape(c.privacy)}</a><button id="analytics-preferences">${escape(c.preferences)}</button></div></footer>
  <aside id="consent" role="region" aria-labelledby="consent-title" hidden><h2 id="consent-title">${escape(c.analyticsTitle)}</h2><p>${escape(c.analyticsBody)}</p><div class="links"><button class="button" id="analytics-accept">${escape(c.accept)}</button><button class="button secondary" id="analytics-decline">${escape(c.decline)}</button></div></aside></body></html>`;
  writeFileSync(`${directory}/index.html`, html);
}
writeFileSync('site-dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(LOCALES).map(code => `<url><loc>${localeUrl(code)}</loc></url>`).join('')}</urlset>`);
writeFileSync('site-dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${root}sitemap.xml\n`);
writeFileSync('site-dist/.nojekyll', '');
console.log('Generated 17 static, localized pages in site-dist.');
