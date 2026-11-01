// Records only an isolated, locally served fictional page and the built extension.
// Never connect this script to an existing browser profile or a real account.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { House, SquarePen, PanelsTopLeft, Clock3, Compass, Folder, LayoutGrid, MoreHorizontal, UserRound, Copy, Volume2, Upload, RefreshCw, Expand, CornerDownRight, Plus, ChevronDown, Mic, AudioLines } from 'lucide-react';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const out = path.resolve('assets/demo');
await mkdir(out, { recursive: true });
await mkdir('build/demo-recording', { recursive: true });
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium', headless: true, viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
  recordVideo: { dir: 'build/demo-recording', size: { width: 1920, height: 1080 } },
  args: [`--disable-extensions-except=${path.resolve('dist')}`, `--load-extension=${path.resolve('dist')}`,
    '--disable-features=HardwareMediaKeyHandling,MediaSessionService'],
});
const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
const extensionId = worker.url().split('/')[2];
await worker.evaluate(() => chrome.storage.sync.set({ 'cgpt-ra-settings': { language: 'en', theme: 'dark', notifyDownloadReady: false } }));
const setLayout = preset => worker.evaluate(preset => chrome.storage.local.set({ 'cgpt-ra-layout-v1': {
  version: 2, desktop: { preset, seekFirst: true }, narrow: { preset: 'composer', seekFirst: true },
} }), preset);
await setLayout('composer');
// Silent generated PCM supplies a real retained payload. It is not a TTS recording.
const pcm = Buffer.alloc(44 + 8000 * 90 * 2);
pcm.write('RIFF'); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(8000, 24); pcm.writeUInt32LE(16000, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(pcm.length - 44, 40);
const icons = { House, SquarePen, PanelsTopLeft, Clock3, Compass, Folder, LayoutGrid, MoreHorizontal, UserRound, Copy, Volume2, Upload, RefreshCw, Expand, CornerDownRight, Plus, ChevronDown, Mic, AudioLines };
let html = await readFile('scripts/fixtures/website-demo.html', 'utf8');
html = html.replace(/\{\{(\w+)\}\}/g, (_, name) => renderToStaticMarkup(React.createElement(icons[name], { size: 18, strokeWidth: 1.6, 'aria-hidden': true })));
const requests = [];
await context.route('**/*', async route => {
  const url = route.request().url(); requests.push(url);
  if (url === 'https://chatgpt.com/demo.wav') return route.fulfill({ body: pcm, contentType: 'audio/wav' });
  if (url === 'https://chatgpt.com/') return route.fulfill({ body: html, contentType: 'text/html' });
  if (url.startsWith('chrome-extension://' + extensionId + '/')) return route.continue();
  return route.abort();
});
const page = await context.newPage();
const chapters = [];
await page.goto('https://chatgpt.com/');
const started = Date.now();
async function chapter(title, detail) {
  chapters.push({ start: (Date.now() - started) / 1000, text: title.replace(/\.$/, '') + '. ' + detail });
  await page.evaluate(({title,detail}) => { document.getElementById('chapter').textContent=title;document.getElementById('detail').textContent=detail; }, {title,detail});
}
try {
  await chapter('Listen at your own pace', 'A silent demonstration using fictional content and the real extension.');
  await page.locator('#read').click();
  await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('aria-expanded','true');
  await page.waitForTimeout(2500);
  await page.locator('.chapter').evaluate(el => el.hidden = true);
  await page.screenshot({ path: path.join(out, 'composer-dock.png') });
  await page.locator('.chapter').evaluate(el => el.hidden = false);
  await chapter('Find your rhythm', 'Change playback speed without leaving the conversation.');
  await page.locator('.cgpt-ra-speed-btn').click();
  await page.waitForTimeout(1200);
  await page.locator('.cgpt-ra-speed-option[data-speed="1.5"]').click();
  await page.waitForTimeout(2500);
  await chapter('Skip straight to the useful part', 'Seek forward or back while your audio keeps playing.');
  await page.locator('#cgpt-ra-left input[type="range"]').focus();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(2500);
  await chapter('Keep your audio', 'Download the retained audio with one click.');
  await page.locator('.cgpt-ra-download').click();
  await page.waitForTimeout(2500);
  await chapter('Give your conversation room', 'Collapse the player, then bring it back when you need it.');
  await page.locator('#cgpt-ra-floating-toggle').click();await page.waitForTimeout(2000);
  await page.locator('#cgpt-ra-floating-toggle').click();await page.waitForTimeout(1500);
  await chapter('A layout that fits your space', 'Choose a corner layout or dock directly above the composer.');
  await setLayout('bottom-right');await page.waitForTimeout(2200);
  await page.locator('.chapter').evaluate(el => el.hidden = true);
  await page.screenshot({ path: path.join(out, 'corner-layout.png') });
  await page.locator('.chapter').evaluate(el => el.hidden = false);
  await setLayout('composer');await page.waitForTimeout(1800);
  await chapter('Your listening. Your controls.', 'Play, seek, change speed and download with ChatGPT Audio Controls.');
  await page.waitForTimeout(2500);
  const video = page.video();await page.close();
  const raw = await video.path();
  execFileSync('ffmpeg', ['-y','-i',raw,'-an','-map_metadata','-1','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'walkthrough.mp4')], {stdio:'ignore'});
  await setLayout('original');
  const reference = await context.newPage();await reference.goto('https://chatgpt.com/');
  await expect(reference.locator('#cgpt-ra-floating-toggle')).toBeVisible();
  await reference.locator('.chapter').evaluate(el => el.hidden = true);
  await reference.waitForTimeout(700);
  await reference.screenshot({path:path.join(out,'original-layout.png')});await reference.close();
  await setLayout('composer');
  const options = await context.newPage();await options.goto('chrome-extension://' + extensionId + '/src/options/index.html');
  await options.waitForTimeout(1200);await options.screenshot({path:path.join(out,'settings.png')});await options.close();
  await writeFile(path.join(out,'chapters.json'),JSON.stringify(chapters,null,2)+'\n');
  await writeFile('build/demo-recording/network-audit.json',JSON.stringify(requests,null,2));
  console.log('Created privacy-safe screenshots and silent walkthrough in assets/demo.');
} finally { await context.close(); }
