import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const key='cgpt-ra-engagement-v1';
function state(uses=0){const r=()=>({status:'new',displays:0,shownAt:0,afterTime:0,afterUses:0});return {version:1,uses,enabled:true,lastShown:0,review:r(),donation:r()};}
function wav(seconds=2){const data=Buffer.alloc(44+8000*seconds*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(8000,24);data.writeUInt32LE(16000,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;}
const fixture=`<!doctype html><html class="light"><head><meta charset="utf-8"><style>body{margin:0;background:#fff;color:#222;font:16px system-ui}main{padding:20px}form{position:fixed;bottom:12px;left:5%;width:90%;height:90px;border-radius:24px;background:#eee;padding:12px;box-sizing:border-box}button{padding:12px}#prompt-textarea{min-height:30px}</style></head><body><main><article><p>A fictional demonstration response.</p><button id="start">Read aloud</button></article></main><form data-chatgpt-composer><div id="prompt-textarea" contenteditable="true" aria-label="Ask ChatGPT"></div></form><audio id="host"></audio><script>start.onclick=async()=>{host.src=URL.createObjectURL(await (await fetch('/sample.wav')).blob());await host.play();};</script></body></html>`;
for(const distribution of ['extension','userscript']) test.describe('support '+distribution,()=>{
 let context,worker,id;
 test.beforeAll(async()=>{
  context=await chromium.launchPersistentContext('',{channel:'chromium',headless:true,args:['--disable-features=HardwareMediaKeyHandling,MediaSessionService',...(distribution==='extension'?[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]:[])]});
  if(distribution==='extension'){worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');id=worker.url().split('/')[2];}
  else await context.addInitScript({content:await fs.readFile('userscript/chatgpt-audio-controls.user.js','utf8')});
  await context.route('https://chatgpt.com/**',route=>route.fulfill(route.request().url().endsWith('sample.wav')?{body:wav(),contentType:'audio/wav'}:{body:fixture,contentType:'text/html'}));
 });
 test.afterAll(async()=>context?.close());
 async function seed(page,value){if(worker)await worker.evaluate(({key,value})=>chrome.storage.local.set({[key]:value}),{key,value});else await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key,value});}
 async function stored(page){return worker?worker.evaluate(key=>chrome.storage.local.get(key).then(x=>x[key]),key):page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
 async function open(uses=3,width=1366,language='en'){
  const page=await context.newPage();await page.setViewportSize({width,height:900});
  const settings={notifyDownloadReady:false,language,theme:'light',floatingUiHidden:false};
  if(worker)await worker.evaluate(settings=>chrome.storage.sync.set({'cgpt-ra-settings':settings}),settings);
  else await page.addInitScript(settings=>localStorage.setItem('cgpt-ra-settings',JSON.stringify(settings)),settings);
  await page.goto('https://chatgpt.com/');if(!worker)await page.evaluate(settings=>window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_SETTINGS_UPDATE',settings},'*'),settings);await seed(page,state(uses));await page.bringToFront();await expect(page.locator('#cgpt-ra-floating-toggle')).toBeVisible();return page;
 }
 test('short natural listening counts once, review waits for end, and dismissal persists',async()=>{
  const page=await open();await page.locator('#start').click();
  await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);
  await expect.poll(async()=>(await stored(page))?.uses).toBe(4);
  await expect(page.locator('#cgpt-ra-support-prompt')).toBeVisible({timeout:10000});
  expect(await page.evaluate(()=>document.activeElement?.id)).toBe('start');
  await expect(page.locator('#cgpt-ra-support-prompt a')).toHaveAttribute('href',/chromewebstore.*reviews/);
  await page.keyboard.press('Escape');await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);
  await expect.poll(async()=>(await stored(page)).review.status).toBe('done');
  await page.reload();expect((await stored(page)).review.status).toBe('done');await page.close();
 });
 test('donation is one-time, reminder has both thresholds, disabling cancels it',async()=>{
  const page=await open(9);await page.locator('#start').click();
  await expect(page.locator('#cgpt-ra-support-prompt')).toBeVisible({timeout:10000});
  const card=page.locator('#cgpt-ra-support-prompt');await expect(card.locator('a[href*="github.com/sponsors"]')).toHaveCount(4);
  await card.getByRole('button',{name:'Remind me later',exact:true}).click();
  await expect.poll(async()=>(await stored(page)).donation.status).toBe('later');
  const saved=await stored(page);expect(saved.donation.afterUses).toBe(20);expect(saved.donation.afterTime-Date.now()).toBeGreaterThan(13.9*86400000);
  if(worker){
   const options=await context.newPage();await options.goto(`chrome-extension://${id}/src/options/index.html`);
   const toggle=options.getByRole('checkbox',{name:'Show review and support reminders'});await expect(toggle).toBeChecked();await toggle.uncheck();
   await expect.poll(async()=>(await stored(page)).enabled).toBe(false);expect((await stored(page)).donation.status).toBe('done');await options.close();
  }
  await page.close();
 });
 test('typing and hidden controls defer; navigation and resumed playback remove cards',async()=>{
  const page=await open();await page.locator('#start').click();
  const editor=page.locator('#prompt-textarea');await editor.focus();
  for(let i=0;i<7;i++){await editor.press('a');await page.waitForTimeout(700);}
  await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);
  if(worker)await worker.evaluate(()=>chrome.storage.sync.set({'cgpt-ra-settings.floatingUiHidden':true}));else await page.evaluate(()=>window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_SETTINGS_UPDATE',settings:{notifyDownloadReady:false,language:'en',floatingUiHidden:true}},'*'));
  await editor.blur();await page.waitForTimeout(3500);await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);
  if(worker)await worker.evaluate(()=>chrome.storage.sync.set({'cgpt-ra-settings.floatingUiHidden':false}));else await page.evaluate(()=>window.postMessage({source:'chatgpt-audio-controls-settings-bridge',type:'CGPT_RA_SETTINGS_UPDATE',settings:{notifyDownloadReady:false,language:'en',floatingUiHidden:false}},'*'));
  await expect(page.locator('#cgpt-ra-support-prompt')).toBeVisible({timeout:8000});
  await page.locator('#start').click();await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);
  await page.goto('https://chatgpt.com/c/demo');await expect(page.locator('#cgpt-ra-support-prompt')).toHaveCount(0);await page.close();
 });
 test('two tabs share the count and only the visible tab claims a request',async()=>{
  const first=await open(3),second=await open(3);
  await first.locator('#start').click();
  // Headless Chromium reports every page as visible. Model the inactive tab explicitly.
  await first.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await second.locator('#start').click();await second.bringToFront();
  await expect.poll(async()=>(await stored(second)).uses).toBe(5);
  await expect(second.locator('#cgpt-ra-support-prompt')).toBeVisible({timeout:10000});
  await expect(first.locator('#cgpt-ra-support-prompt')).toHaveCount(0);expect((await stored(second)).review.displays).toBe(1);
  await second.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='native-dialog';dialog.textContent='Example menu';document.body.append(dialog);dialog.showModal();});
  await expect(second.locator('#cgpt-ra-support-prompt')).toBeHidden();await second.locator('#native-dialog').evaluate(el=>el.remove());await expect(second.locator('#cgpt-ra-support-prompt')).toBeVisible();expect((await stored(second)).review.displays).toBe(1);
  await second.close();await first.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await first.bringToFront();await first.waitForTimeout(1000);await expect(first.locator('#cgpt-ra-support-prompt')).toHaveCount(0);await first.close();
 });
 test('dashboard and popup support sections keep touch targets, language and storage',async()=>{
  test.skip(!worker,'React surfaces are extension-only');
  for(const language of ['en','de','ar']){
   await worker.evaluate(language=>chrome.storage.sync.set({'cgpt-ra-settings.language':language}),language);
   for(const surface of ['options','popup']){
    const page=await context.newPage();await page.goto(`chrome-extension://${id}/src/${surface}/index.html`);
    if(surface==='popup')await page.locator('.tab-btn').nth(2).click();
    await expect(page.locator('.donation-amounts a')).toHaveCount(4);
    for(const width of [320,360,390,768,1366]){
     await page.setViewportSize({width,height:900});
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
     for(const a of await page.locator('.donation-amounts a').all()){const r=await a.boundingBox();expect(r.width).toBeGreaterThanOrEqual(43.99);expect(r.height).toBeGreaterThanOrEqual(43.99);}
    }
    if(language==='en'){await page.setViewportSize({width:surface==='popup'?360:1366,height:900});await page.locator('.donation-section').scrollIntoViewIfNeeded();await page.screenshot({path:`build/support-${surface}.png`});}
    await page.close();
   }
  }
 });
 test('narrow RTL card fits without covering composer and light/dark screenshot',async()=>{
  const page=await open(9,390,'ar');await page.locator('#start').click();
  await expect.poll(async()=>(await stored(page))?.uses).toBe(10);
  // A long translation may defer if no collision-free rectangle fits; never consume it.
  await page.waitForTimeout(4500);
  const card=page.locator('#cgpt-ra-support-prompt');
  if(await card.isVisible()){
   const c=await card.boundingBox(),f=await page.locator('form').boundingBox();expect(c.x).toBeGreaterThanOrEqual(0);expect(c.x+c.width).toBeLessThanOrEqual(390);expect(c.y+c.height).toBeLessThan(f.y);await expect(card).toHaveAttribute('dir','rtl');
   await page.screenshot({path:`build/support-${distribution}-mobile.png`});
  }else expect((await stored(page)).donation.displays).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.close();
 });
});
