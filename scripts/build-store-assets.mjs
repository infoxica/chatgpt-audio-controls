// Capture the built extension over the existing fictional ChatGPT fixture.
// Use a fresh profile and deny every non-fixture network request.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from 'lucide-react';

const store = 'assets/store', demo = 'assets/demo';
for (const dir of [store + '/screenshots', demo, 'build/store-artwork']) await mkdir(dir, {recursive:true});
const context = await chromium.launchPersistentContext('', {
  channel:'chromium', headless:true, viewport:{width:1920,height:1080}, deviceScaleFactor:1,
  args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`],
});
const audit = [];
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const id = worker.url().split('/')[2];
  await worker.evaluate(() => chrome.storage.sync.set({'cgpt-ra-settings':{language:'en',theme:'dark',notifyDownloadReady:false}}));
  const layout = preset => worker.evaluate(preset => chrome.storage.local.set({'cgpt-ra-layout-v1':{
    version:2,desktop:{preset,seekFirst:true},narrow:{preset:'composer',seekFirst:true},
  }}),preset);
  let html = await readFile('scripts/fixtures/website-demo.html','utf8');
  html = html.replace(/\{\{(\w+)\}\}/g,(_,name)=>renderToStaticMarkup(React.createElement(icons[name],{size:18,strokeWidth:1.6,'aria-hidden':true})));
  const pcm = Buffer.alloc(44+8000*90*2);
  pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);
  pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);
  pcm.writeUInt32LE(8000,24);pcm.writeUInt32LE(16000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);
  pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
  await context.route('**/*',async route=>{
    const url=route.request().url();
    const allowed=url==='https://chatgpt.com/'||url==='https://chatgpt.com/demo.wav'||url.startsWith(`chrome-extension://${id}/`);
    audit.push({url,allowed});
    if(url==='https://chatgpt.com/')return route.fulfill({body:html,contentType:'text/html'});
    if(url==='https://chatgpt.com/demo.wav')return route.fulfill({body:pcm,contentType:'audio/wav'});
    if(url.startsWith(`chrome-extension://${id}/`))return route.continue();
    return route.abort();
  });
  const page=await context.newPage();await page.emulateMedia({reducedMotion:'reduce'});
  await layout('composer');await page.goto('https://chatgpt.com/');await page.bringToFront();
  await page.locator('.chapter').evaluate(el=>el.hidden=true);
  await page.locator('#read').click();await expect(page.locator('.cgpt-ra-download')).toBeEnabled();
  await page.locator('.cgpt-ra-play').click();
  await page.locator('#cgpt-ra-left input[type="range"]').fill('32');
  async function capture(preset,file,directory) {
    await layout(preset);
    await expect(page.locator('#cgpt-ra-floating-toggle')).toHaveAttribute('data-preset',preset);
    if(preset==='composer')await expect.poll(()=>page.evaluate(()=>Math.abs(document.querySelector('#cgpt-ra-dock').getBoundingClientRect().width-document.querySelector('form').getBoundingClientRect().width))).toBeLessThan(1);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    for(const selector of ['#cgpt-ra-left','#cgpt-ra-right','#cgpt-ra-floating-toggle']) {
      const r=await page.locator(selector).boundingBox();
      if(!r||r.x<0||r.y<0||r.x+r.width>page.viewportSize().width+.5||r.y+r.height>page.viewportSize().height+.5)throw new Error(`Clipped ${preset} ${selector}`);
    }
    await page.mouse.move(page.viewportSize().width-60,100);
    await page.screenshot({path:`${directory}/${file}.png`,animations:'disabled'});
  }
  for(const [preset,file] of [['composer','composer-dock'],['bottom-right','corner-layout'],['left','side-layout'],['original','original-layout']])await capture(preset,file,demo);
  await page.locator('form').evaluate(el=>{el.style.height='240px';el.style.alignItems='flex-end';el.style.paddingBottom='12px';el.querySelector('[contenteditable]').style.alignSelf='stretch';el.querySelector('[contenteditable]').textContent='Help me turn this morning routine into a simple checklist.\n\nInclude time for a quiet start, one meaningful priority, and a short walk.';});
  await expect.poll(()=>page.evaluate(()=>Math.abs(document.querySelector('#cgpt-ra-left').getBoundingClientRect().top-document.querySelector('form').getBoundingClientRect().top))).toBeLessThan(1);
  await capture('split-bottom','split-bottom',demo);
  await page.locator('form').evaluate(el=>{el.removeAttribute('style');el.querySelector('[contenteditable]').removeAttribute('style');el.querySelector('[contenteditable]').textContent='Ask ChatGPT';});
  await page.setViewportSize({width:1280,height:800});
  for(const [preset,file] of [['composer','composer-dock'],['bottom-right','corner-layout'],['left','side-layout']])await capture(preset,file,store+'/screenshots');
  await layout('composer');
  const options=await context.newPage();await options.emulateMedia({reducedMotion:'reduce'});
  await options.goto(`chrome-extension://${id}/src/options/index.html`);
  await expect(options.locator('.layout-settings')).toBeVisible();
  for(const [width,height,directory] of [[1920,1080,demo],[1280,800,store+'/screenshots']]) {
    await options.setViewportSize({width,height});
    await options.locator('.settings-section').evaluate(el=>window.scrollTo(0,el.getBoundingClientRect().top+scrollY-24));
    await options.screenshot({path:`${directory}/settings.png`,animations:'disabled'});
  }
  await options.getByRole('button',{name:'Shortcuts & Gestures'}).click();
  await options.evaluate(()=>window.scrollTo(0,0));
  await options.screenshot({path:store+'/screenshots/shortcuts.png',animations:'disabled'});
  // Keep existing project branding, using its high-resolution source for Edge.
  await copyFile('public/icons/icon-128.png',store+'/icon-128.png');
  const brand='data:image/png;base64,'+(await readFile('public/icons/ms-icon-310x310.png')).toString('base64');
  const art=await context.newPage();
  await art.setViewportSize({width:300,height:300});
  await art.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:300px;height:300px}</style><img src="${brand}">`);
  await art.locator('img').evaluate(img=>img.decode());
  await art.screenshot({path:store+'/logo-300.png',omitBackground:true});
  for(const [file,width,height] of [['small-promo-440x280',440,280],['marquee-promo-1400x560',1400,560],['promo-1280x800',1280,800]]) {
    await art.setViewportSize({width,height});
    const large=width>500;
    await art.setContent(`<!doctype html><html><style>*{box-sizing:border-box}body{margin:0;background:#191919;color:#fafafa;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh}.brand{max-width:90%;display:flex;gap:${large?40:20}px;align-items:center}img{width:${large?160:72}px;flex:none}h1{font-size:${large?66:29}px;line-height:1.15;font-weight:550;letter-spacing:-.035em;margin:0 0 18px}p{font-size:${large?26:14}px;color:#bcbcbc;margin:0}span{color:#6b9cf2}</style><div class="brand"><img src="${brand}" alt=""><div><h1>ChatGPT<br>Audio Controls</h1><p>Pause <span>·</span> Seek <span>·</span> Speed <span>·</span> Download</p></div></div></html>`);
    await art.locator('img').evaluate(img=>img.decode());
    await art.screenshot({path:`${store}/${file}.png`});
  }
  await writeFile('build/store-artwork/network-audit.json',JSON.stringify(audit,null,2)+'\n');
  console.log('Created store artwork, 1280×800 store screenshots and 1920×1080 website screenshots.');
} finally { await context.close(); }
