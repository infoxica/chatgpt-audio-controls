import { cpSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import config from '../config/release.json';
import { analyticsLocation } from '../site/analytics';


// Keep a complete candidate snapshot before making redirect-only Pages.
cpSync('site-dist', 'build/website-snapshot', { recursive: true });
cpSync('site-dist', 'build/site-staging', { recursive: true });
writeFileSync('build/site-staging/_headers', '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n');
writeFileSync('build/site-staging/robots.txt', 'User-agent: *\nDisallow: /\n');

const destination = 'build/legacy-pages';
mkdirSync(destination, { recursive: true });
cpSync('site-dist/assets', join(destination, 'assets'), { recursive: true });
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
let pages = 0;
function visit(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'assets') visit(source); continue; }
    if (!entry.name.endsWith('.html')) continue;
    const route = relative('site-dist', source).replaceAll('\\', '/');
    const canonical = new URL(route.replace(/index\.html$/, ''), config.siteUrl).href;
    const output = join(destination, route);
    mkdirSync(join(output, '..'), { recursive: true });
    writeFileSync(output, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT Audio Controls has moved</title><link rel="canonical" href="${escape(canonical)}"><meta http-equiv="refresh" content="1;url=${escape(canonical)}"><meta name="robots" content="noindex"><script src="/chatgpt-audio-controls/redirect.js" defer></script></head><body><p>Our website has moved. <a href="${escape(canonical)}">Continue to ChatGPT Audio Controls</a>.</p></body></html>\n`);
    pages++;
  }
}
visit('site-dist');
// Reuse the site's campaign allowlist; never forward arbitrary query values.
writeFileSync(join(destination, 'redirect.js'), `const clean = (${analyticsLocation.toString()})(location.href);\nconst target = new URL(document.querySelector('link[rel="canonical"]').href);\ntarget.search = new URL(clean).search;\nif (/^#[a-zA-Z0-9_-]{1,80}$/.test(location.hash)) target.hash = location.hash;\nlocation.replace(target.href);\n`);
writeFileSync(join(destination, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl}sitemap.xml\n`);
writeFileSync(join(destination, '.nojekyll'), '');
console.log(`Prepared staging assets, candidate snapshot and ${pages} legacy redirect pages.`);
