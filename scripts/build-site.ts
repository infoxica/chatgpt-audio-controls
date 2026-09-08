import { mkdirSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createElement, type ComponentType } from 'react';
import { build } from 'vite';
import { Button, SiteNavigation, HeaderControls, FaqAccordion, ConsentBanner } from '../site/components';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { CirclePlay, Gauge, Download, Volume2, Rewind, MessageCircleMore, ArrowRight, ExternalLink, type LucideIcon } from 'lucide-react';
import { releaseLocales } from '../src/shared/i18n/release-copy';
import { LOCALES } from '../src/shared/i18n/core';
import { SPEED_PRESETS, SUPPORTED_LANGUAGES } from '../src/shared/constants';
import config from '../config/release.json';
import TurndownService from 'turndown';
import navigationCopy from '../site/navigation-copy.json';
import websiteCopy from '../site/copy.json';
import guideCopy from '../site/guide-copy.json';
import { GuidePage, type GuideRoute } from '../site/GuidePages';

const markdown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
markdown.remove(node => ['SCRIPT', 'STYLE', 'SVG', 'NAV'].includes(node.nodeName.toUpperCase()));
const contentPaths = ['scripts/build-site.ts', 'site/GuidePages.tsx', 'site/components.tsx',
  'site/copy.json', 'site/guide-copy.json', 'site/navigation-copy.json', 'src/shared/i18n',
  'src/shared/constants.ts', 'assets/store/screenshots', 'assets/HRs9MPufa1J1h5glNhut.png',
  'assets/English_Get it from Microsoft Edge.png'];
// Commit history is stable across rebuilds. Only locally changed source files
// use their actual edit time; never substitute the time of publication/build.
const committed = execFileSync('git', ['log', '-1', '--format=%cI', '--', ...contentPaths], { encoding: 'utf8' }).trim();
const changed = execFileSync('git', ['ls-files', '-z', '--modified', '--others', '--exclude-standard', '--', ...contentPaths], { encoding: 'utf8' }).split('\0').filter(Boolean);
const lastModified = new Date(Math.max(Date.parse(committed), ...changed.map(file => statSync(file).mtimeMs))).toISOString();
const pages: { url: string; title: string; locale: string; markdown: string }[] = [];
const root = config.siteUrl;
const path = new URL(root).pathname;
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const localeUrl = (code: string) => root + (code === 'en' ? '' : code + '/');
const chromeUrl = 'https://chromewebstore.google.com/detail/aifalimlfgiepmbejcemcofninobaiea/';
const edgeUrl = 'https://microsoftedge.microsoft.com/addons/detail/chatgpt-audio-controls-/cmhbacgmcgiolpidfjcpefkhbbeamemf';
const chromeReviewUrl = 'https://chromewebstore.google.com/detail/chatgpt-audio-controls-re/aifalimlfgiepmbejcemcofninobaiea/reviews';
const edgeReviewUrl = edgeUrl + '#review-section';
const alternativesFor = (slug: string) => Object.keys(LOCALES).map(code => `<link rel="alternate" hreflang="${code}" href="${localeUrl(code)}${slug}">`).join('') + `<link rel="alternate" hreflang="x-default" href="${root}${slug}">`;
mkdirSync('site-dist/assets', { recursive: true });
copyFileSync('site/site.css', 'site-dist/assets/site.css');

copyFileSync('assets/HRs9MPufa1J1h5glNhut.png', 'site-dist/assets/chrome-store.png');
copyFileSync('assets/English_Get it from Microsoft Edge.png', 'site-dist/assets/edge-addons.png');
copyFileSync('public/icons/icon-128.png', 'site-dist/assets/icon.png');
copyFileSync('assets/store/screenshots/01-active-read-aloud-1280x800.png', 'site-dist/assets/player.png');
copyFileSync('assets/store/screenshots/03-popup-controls-1280x800.png', 'site-dist/assets/popup.png');
// Render the existing Lucide components at build time; no icon runtime or CDN.
const icon = (component: LucideIcon, className = '') => renderToStaticMarkup(createElement(component, {
  size: 20, strokeWidth: 1.6, className, 'aria-hidden': true, focusable: false,
}));
const playIcon = icon(CirclePlay);
const featureIcons = [CirclePlay, Gauge, Download, Volume2, Rewind, MessageCircleMore].map(component => icon(component));
const externalLinkIcon = icon(ExternalLink, 'external-link-icon');
const json = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
function island<P extends object>(id: string, component: ComponentType<P>, props: P) {
  return `<div id="${id}">${renderToString(createElement(component, props), { identifierPrefix: id })}</div><script type="application/json" id="${id}-props">${json(props)}</script>`;
}
const linkButton = (href: string, label: string, newTab = false) => renderToStaticMarkup(createElement(Button, { asChild: true, className: 'text-button' },
  createElement('a', { href, ...(newTab ? { target: '_blank', rel: 'noreferrer' } : {}) }, label, createElement(href.startsWith(root) ? ArrowRight : ExternalLink, { size: 14, className: 'external-link-icon', 'aria-hidden': true }))));
await build({
  configFile: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { outDir: 'site-dist/assets', emptyOutDir: false, minify: true,
    lib: { entry: 'site/client.tsx', formats: ['es'], fileName: () => 'site.js' } },
});
for (const [code, base] of Object.entries(LOCALES)) {
  const c = releaseLocales[code];
  const n = navigationCopy[code as keyof typeof navigationCopy];
  if (!n || Object.keys(navigationCopy.en).some(key => !n[key as keyof typeof n]?.trim())) throw new Error(`Missing navigation translation ${code}`);
  const g = guideCopy[code as keyof typeof guideCopy];
  if (!g || Object.keys(guideCopy.en).some(key => !g[key as keyof typeof g]?.trim())) throw new Error(`Missing guide translation ${code}`);
  const w = websiteCopy[code as keyof typeof websiteCopy];
  if (!w || Object.keys(w).length !== Object.keys(websiteCopy.en).length || Object.keys(websiteCopy.en).some(key => typeof w[key as keyof typeof w] !== 'string' || !w[key as keyof typeof w].trim())) throw new Error(`Missing website content ${code}`);
  if (!c) throw new Error(`Missing website translation ${code}`);
  const url = localeUrl(code);
  const directory = `site-dist/${code === 'en' ? '' : code}`;
  mkdirSync(directory, { recursive: true });
  const install = (placement: string) => `<div class="store-links">${(['chrome', 'edge'] as const).map(store => {
    const target = new URL(store === 'chrome' ? chromeUrl : edgeUrl);
    target.search = new URLSearchParams({ utm_source: 'official_website', utm_medium: 'referral', utm_campaign: 'extension', utm_content: `${code}_${placement}` }).toString();
    return `<a class="store-badge" data-store="${store}" data-placement="${placement}" href="${escape(target.toString())}"><img src="${path}assets/${store === 'chrome' ? 'chrome-store' : 'edge-addons'}.png" alt="${escape(c[store])}" width="${store === 'chrome' ? 496 : 1178}" height="${store === 'chrome' ? 150 : 312}"></a>`;
  }).join('')}</div>`;
  const features = [[base.content.shortcutsPopover.playPause, base.shortcuts.playPause.description], [base.content.tooltips.speed, base.options.general.speedDesc], [base.content.tooltips.download, c.sourceFormat], [base.content.shortcutsPopover.volumeScroll, base.options.faq.a1], [base.popup.quickControls.smoothScrubbing, base.popup.quickControls.smoothScrubbingDesc], [base.popup.quickControls.inlineSpeech, base.popup.quickControls.inlineSpeechDesc]];
  const shortcutRows = [[base.shortcuts.playPause.action, 'Space / K · Alt+P', 'Space / K · Option ⌥+P'], [base.shortcuts.seekBack.action, 'Alt+←', 'Option ⌥+←'], [base.shortcuts.seekForward.action, 'Alt+→', 'Option ⌥+→'], [base.shortcuts.speedDecrease.action, 'Shift+,', 'Shift ⇧+,'], [base.shortcuts.speedIncrease.action, 'Shift+.', 'Shift ⇧+.']];
  const controlsFor = (slug: string) => island('site-controls', HeaderControls, {
    locale: code, languageLabel: c.language, themeLabel: base.popup.header.switchTheme,
    options: SUPPORTED_LANGUAGES.filter(item => item.code !== 'auto').map(item => ({ code: item.code, name: item.nativeName, url: localeUrl(item.code) + slug })),
  });
  const faq = island('site-faq', FaqAccordion, { items: [
    [base.options.faq.q1,base.options.faq.a1], [base.options.faq.q2,base.options.faq.a2],
    [base.options.faq.q3,c.sourceFormat], [base.options.faq.q4,base.options.faq.a4],
    [base.options.faq.q6,c.privacyBody], [base.content.tooltips.readAloud,c.nativeHelp],
    [base.content.tooltips.playPause,c.playError],
  ] });
  const consent = island('site-consent', ConsentBanner, { title: c.analyticsTitle, body: c.analyticsBody, accept: c.accept, decline: c.decline });
  const schema = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'ChatGPT Audio Controls', applicationCategory: 'BrowserApplication', operatingSystem: 'Windows, macOS, Linux, ChromeOS', isAccessibleForFree: true, url, description: c.siteIntro, image: root + 'assets/player.png', author: { '@type': 'Organization', name: 'Infoxica' }, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } };
  const groups = [
    { label: n.product, links: [{ label: n.overview, href: url, description: c.siteIntro }, { label: c.features, href: url+'#features', description: c.siteTitle }, { label: c.setup, href: url+'#setup', description: c.stepInstall }, { label: base.common.dashboard, href: url+'#dashboard', description: base.options.headers.preferencesDesc }] },
    { label: n.guides, links: [{ label: base.popup.about.documentation, href: url+'guide/', description: c.quickStartBody }, { label: g.installation, href: url+'installation/', description: c.stepInstall }, { label: 'Tampermonkey', href: url+'userscript/', description: w.userscriptNote }, { label: g.glossary, href: url+'glossary/', description: g.glossaryIntro }] },
    { label: n.support, links: [{ label: c.help, href: url+'#help', description: n.helpDescription }, { label: n.reviews, href: url+'#reviews', description: n.reviewsDescription }, { label: c.privacy, href: url+'#privacy', description: n.privacyDescription }, { label: base.popup.about.reportIssue, href: 'https://github.com/infoxica/chatgpt-audio-controls/issues', description: n.issueDescription }] },
  ];
  const navigation = island('site-navigation', SiteNavigation, { label: n.navigation, groups });
  const footerNavigation = `<nav class="footer-navigation" aria-label="${escape(n.navigation)}">${groups.map(group => `<div><h2>${escape(group.label)}</h2>${group.links.map(link => `<a href="${link.href}">${escape(link.label)}</a>`).join('')}</div>`).join('')}</nav>`;
  const renderPage = (slug: string, title: string, description: string, content: string, schema: object) => {
    const pageUrl = url + slug;
    const alternatives = alternativesFor(slug);
    mkdirSync(directory + '/' + slug, { recursive: true });
    const markdownPage = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\nurl: ${JSON.stringify(pageUrl)}\nlanguage: ${JSON.stringify(code)}\nlastmod: ${JSON.stringify(lastModified)}\nlast_updated: ${JSON.stringify(lastModified)}\n---\n\nSource: ${pageUrl}\nLanguage: ${code}\n\n${markdown.turndown(content.replace(/(href|src)="(\/[^" ]*)"/g, (_, attribute, target) => `${attribute}="${new URL(target, root).href}"`))}\n\n${c.independent}\n\n${n.disclaimer}\n\n## Sitemap\n\nSee the full [sitemap](${root}sitemap.md) for all pages.\n`;
    writeFileSync(directory + '/' + slug + 'index.md', markdownPage);
    if (slug) writeFileSync(directory + '/' + slug.replace(/\/$/, '') + '.md', markdownPage);
    else if (code !== 'en') writeFileSync('site-dist/' + code + '.md', markdownPage);
    pages.push({ url: pageUrl, title, locale: code, markdown: markdownPage });
    const graph = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': root+'#publisher', name: 'Infoxica', url: 'https://github.com/infoxica' },
      { '@type': 'WebSite', '@id': root+'#website', name: 'ChatGPT Audio Controls', url: root, publisher: { '@id': root+'#publisher' } },
      { '@type': 'WebPage', '@id': pageUrl+'#page', url: pageUrl, name: title, description, dateModified: lastModified, breadcrumb: { '@id': pageUrl+'#breadcrumb' }, inLanguage: code, isPartOf: { '@id': root+'#website' }, publisher: { '@id': root+'#publisher' } },
      { '@type': 'BreadcrumbList', '@id': pageUrl+'#breadcrumb', itemListElement: [{ '@type': 'ListItem', position: 1, name: slug ? c.website : 'ChatGPT Audio Controls', item: url }, ...(slug ? [{ '@type': 'ListItem', position: 2, name: title, item: pageUrl }] : [])] },
      ...(slug ? [] : [{ ...schema, '@context': undefined, '@id': root+'#software' }]),
    ] };

    return `<!doctype html><html lang="${code}" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} | ChatGPT Audio Controls</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${pageUrl}">${alternatives}<link rel="alternate" type="text/markdown" href="${pageUrl}index.md"><link rel="describedby" type="text/markdown" href="${root}llms.txt"><meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large"><meta property="og:site_name" content="ChatGPT Audio Controls"><meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${pageUrl}"><meta property="og:image" content="${root}assets/player.png"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="800"><meta property="og:image:alt" content="${escape(c.screenshot)}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${root}assets/player.png"><meta name="twitter:image:alt" content="${escape(c.screenshot)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${path}assets/icon.png"><link rel="stylesheet" href="${path}assets/site.css"><script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script><script type="module" src="${path}assets/site.js"></script></head><body data-ga4="${escape(config.websiteGa4Id)}">
  <a class="skip" href="#main">${escape(c.features)}</a><header class="top"><a class="brand" href="${url}"><img src="${path}assets/icon.png" alt="" width="34" height="34"><span>ChatGPT<br>Audio Controls</span></a><div class="header-actions">${navigation}${controlsFor(slug)}</div></header>
  ${content}
  <footer>${footerNavigation}<p>${escape(c.independent)}</p><p class="copyright-disclaimer">${escape(n.disclaimer)}</p><div class="links"><a href="${root}sitemap.xml">${escape(n.sitemap)}</a><a href="${root}llms.txt">llms.txt</a><a href="https://github.com/infoxica/chatgpt-audio-controls">${escape(base.popup.about.githubRepo)}</a><a href="${url}#privacy">${escape(c.privacy)}</a>${renderToStaticMarkup(createElement(Button, { id: 'analytics-preferences', variant: 'link' }, c.preferences))}</div></footer>
  ${consent}</body></html>`;
  };
  const homeContent = `<main id="main"><section class="hero"><div class="eyebrow">${playIcon} ChatGPT Audio Controls</div><h1>${escape(c.siteTitle)}</h1><p class="intro">${escape(c.siteIntro)}</p>${install('hero')}<p class="small">${escape(c.desktop)}<br>${escape(c.available)}</p></section>
  <figure class="player-preview"><img src="${path}assets/player.png" alt="${escape(c.screenshot)}" width="1280" height="800" fetchpriority="high"><figcaption class="small">${escape(c.screenshot)}</figcaption></figure>
  <section class="section feature-section" id="features"><h2>${escape(c.features)}</h2><div class="features">${features.map(([title, body], index) => `<article><span class="feature-icon">${featureIcons[index]}</span><div><h3>${escape(title)}</h3><p>${escape(body)}</p>${index === 1 ? `<div class="speed-presets" aria-label="${escape(base.content.tooltips.speed)}">${SPEED_PRESETS.map(speed=>`<span>${speed}×</span>`).join('')}</div>` : ''}</div></article>`).join('')}</div></section>
  <section class="section setup-section" id="setup"><div><h2>${escape(c.setup)}</h2><ol><li>${escape(c.stepInstall)}${install('setup')}</li><li>${escape(c.stepRead)}<p class="step-action">${linkButton('https://chatgpt.com/',base.common.openChatGPT,true)}</p></li><li>${escape(c.stepControl)}</li></ol></div><div class="shortcuts-panel"><h3>${escape(base.popup.shortcuts.title)}</h3><table><thead><tr><th scope="col">${escape(base.popup.tabs.controls)}</th><th scope="col">Windows / Linux</th><th scope="col">macOS</th></tr></thead><tbody>${shortcutRows.map(([label, windows, mac])=>`<tr><td>${escape(label)}</td><td><kbd>${escape(windows)}</kbd></td><td><kbd>${escape(mac)}</kbd></td></tr>`).join('')}</tbody></table></div></section>
  <section class="section settings-story" id="dashboard"><div><h2>${escape(base.common.dashboard)}</h2><p>${escape(base.options.headers.preferencesDesc)}</p><h3>${escape(base.options.general.languageTitle)}</h3><p>${escape(base.options.general.languageDesc)}</p><h3>${escape(base.options.general.seekTitle)}</h3><p>${escape(base.options.general.seekDesc)}</p><h3>${escape(base.options.nav.darkMode)} / ${escape(base.options.nav.lightMode)}</h3></div><figure><img src="${path}assets/popup.png" alt="${escape(base.options.headers.preferencesTitle)}" width="1280" height="800" loading="lazy"><figcaption class="small">${escape(base.options.headers.preferencesTitle)}</figcaption></figure></section>
  <section class="section reading" id="help"><h2>${escape(c.help)}</h2>${faq}<p><a href="https://github.com/infoxica/chatgpt-audio-controls/issues">${escape(base.popup.about.reportIssue)} ${externalLinkIcon}</a></p></section>
  <section class="section reading" id="guides"><h2>${escape(base.popup.about.documentation)}</h2><p>${escape(g.intro)}</p><div class="links">${linkButton(url+'guide/',base.popup.about.documentation)}${linkButton(url+'installation/',g.installation)}${linkButton(url+'userscript/','Tampermonkey')}${linkButton(url+'glossary/',g.glossary)}</div><p class="small guide-note">${escape(w.userscriptNote)}</p></section>
  <section class="section reading review-section" id="reviews"><h2>${escape(w.reviewTitle)}</h2><p>${escape(w.reviewBody)}</p><div class="links">${[[chromeReviewUrl,'Chrome Web Store'],[edgeReviewUrl,'Microsoft Edge Add-ons']].map(([href,store])=>linkButton(href,w.reviewLink.replace('{store}',store),true)).join('')}</div><p class="small guide-note">${escape(w.reviewHint)}</p></section>
  <section class="section reading" id="privacy"><h2>${escape(c.privacy)}</h2><p>${escape(c.privacyBody)}</p><p>${escape(c.websitePrivacy)}</p><p>${escape(c.feedbackPolicy)}</p></section><section class="section closing"><h2>${escape(c.quickStart)}</h2>${install('footer')}</section></main>`;
  const html = renderPage('', c.siteTitle, c.siteIntro, homeContent, schema);
  writeFileSync(`${directory}/index.html`, html);
  for (const route of ['guide', 'installation', 'userscript', 'glossary'] as GuideRoute[]) {
    const title = route === 'guide' ? base.popup.about.documentation : route === 'installation' ? g.installation : route === 'glossary' ? g.glossary : 'Tampermonkey';
    const storeLinks = (['chrome','edge'] as const).map(store => {
      const target = new URL(store === 'chrome' ? chromeUrl : edgeUrl);
      target.search = new URLSearchParams({ utm_source: 'official_website', utm_medium: 'referral', utm_campaign: 'extension', utm_content: `${code}_installation` }).toString();
      return { store, href: target.toString(), image: `${path}assets/${store === 'chrome' ? 'chrome-store' : 'edge-addons'}.png`, label: c[store], width: store === 'chrome' ? 496 : 1178, height: store === 'chrome' ? 150 : 312 };
    });
    const content = renderToStaticMarkup(createElement(GuidePage, { route, home: url, base, copy: c, guide: g, userscriptNote: w.userscriptNote, storeLinks, shortcuts: shortcutRows }));
    const guideUrl = url + route + '/';
    const guideSchema = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description: g.intro, url: guideUrl, inLanguage: code, isPartOf: { '@type': 'WebSite', name: 'ChatGPT Audio Controls', url: root } };
    mkdirSync(`${directory}/${route}`, { recursive: true });
    writeFileSync(`${directory}/${route}/index.html`, renderPage(route + '/', title, route === 'glossary' ? g.glossaryIntro : g.intro, content, guideSchema));
  }
}
writeFileSync('site-dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${Object.keys(LOCALES).flatMap(code => ['', 'guide/', 'installation/', 'userscript/', 'glossary/'].map(slug => `<url><loc>${localeUrl(code)}${slug}</loc><lastmod>${lastModified}</lastmod>${Object.keys(LOCALES).map(language => `<xhtml:link rel="alternate" hreflang="${language}" href="${localeUrl(language)}${slug}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${root}${slug}"/></url>`)).join('')}</urlset>`);
// Owner-approved policy: public website content is available for search,
// AI inference, and training. Keep current and legacy crawler names explicit.
const crawlers = ['*', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot',
  'Claude-SearchBot', 'Claude-User', 'Claude-Web', 'Google-Extended', 'Amazonbot',
  'anthropic-ai', 'Bytespider', 'CCBot', 'Applebot-Extended'];
writeFileSync('site-dist/robots.txt', '# Public website pages, guides, and assets are crawlable.\n'
  + '# An empty Disallow means no paths are excluded.\n'
  + '# Content Signals express preferences; crawler support varies.\n\n'
  + crawlers.map(agent => `User-agent: ${agent}\nAllow: /\nDisallow:\nContent-Signal: search=yes, ai-input=yes, ai-train=yes\n`).join('\n')
  + `\nSitemap: ${root}sitemap.xml\n`);
writeFileSync('site-dist/.nojekyll', '');
console.log('Generated 85 static pages: home and four guides in all 17 locales.');

writeFileSync('site-dist/llms.txt', `# ChatGPT Audio Controls

> An independent, free, open-source browser extension by Infoxica that adds playback controls to ChatGPT Read Aloud.

The desktop extension offers playback speed, seeking, volume, downloads, and a settings dashboard. Store listings determine the version currently available; repository development does not establish store availability. A standalone Tampermonkey userscript is also available, with its own feature set.

This website supports 17 languages. The extension does not include analytics. Website analytics are optional and consent-gated. Uninstall feedback is voluntary and separate from website analytics.

ChatGPT and OpenAI are trademarks of OpenAI. This project is not affiliated with or endorsed by OpenAI and claims no ownership of OpenAI's trademarks or copyrighted materials.

## Documentation

- [Overview](${root}index.md): Features, setup, shortcuts, FAQs, reviews, and privacy.
- [User guide](${root}guide/index.md): Playback controls, settings, shortcuts, and troubleshooting.
- [Installation](${root}installation/index.md): Store installation, unpacked ZIP, and source builds.
- [Userscript](${root}userscript/index.md): Tampermonkey setup, permissions, and updates.
- [Glossary](${root}glossary/index.md): Playback terminology.
- [Complete context](${root}llms-full.txt): Full content of all pages and translations in one file.
- [Documentation map](${root}sitemap.md): Human-readable page hierarchy.

## Project and distribution

- [Source repository](https://github.com/infoxica/chatgpt-audio-controls): Source code and development history.
- [Published releases](https://github.com/infoxica/chatgpt-audio-controls/releases): Downloadable release assets.
- [Chrome Web Store](${chromeUrl}): Current Chrome listing and availability.
- [Microsoft Edge Add-ons](${edgeUrl}): Current Edge listing and availability.
- [Sitemap](${root}sitemap.xml): Canonical pages and language alternatives.

## Languages

${SUPPORTED_LANGUAGES.filter(item => item.code !== 'auto').map(item => `- [${item.nativeName}](${localeUrl(item.code)}index.md): ${item.code} overview; guide, installation, and userscript pages are available under the same locale path.`).join('\n')}
`);

writeFileSync('site-dist/llms-full.txt', `# ChatGPT Audio Controls — Complete website context\n\n${pages.length} pages in 17 languages. Source content last modified: ${lastModified}.\n\n` + pages.map(page => `## ${page.locale}: ${page.title}\n\n${page.markdown}`).join('\n---\n\n'));
writeFileSync('site-dist/sitemap.md', '# ChatGPT Audio Controls — Documentation sitemap\n\n[Complete context](' + root + 'llms-full.txt) · [XML sitemap](' + root + 'sitemap.xml)\n\n'
  + SUPPORTED_LANGUAGES.filter(item => item.code !== 'auto').map(item => `## ${item.nativeName} (${item.code})\n\n` + pages.filter(page => page.locale === item.code).map(page => `- [${page.title}](${page.url}) · [Markdown](${page.url}index.md)`).join('\n')).join('\n\n') + '\n');
