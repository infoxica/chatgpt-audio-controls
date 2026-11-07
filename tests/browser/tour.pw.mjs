import {test,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {runInNewContext} from 'node:vm';

async function tour(page,language='en',theme='system',fail=false) {
  await page.addInitScript(({language,theme,fail})=>{
    Object.defineProperty(window,'chrome',{configurable:true,value:{storage:{
      sync:{get:async()=>({'cgpt-ra-settings':{language,theme}})},
      local:{set:async value=>{if(fail)throw Error('storage unavailable');sessionStorage.setItem('tourSaved',JSON.stringify(value));}},
    }}});
  },{language,theme,fail});
  await page.route('https://chatgpt.com/**',route=>route.fulfill({body:'ChatGPT destination'}));
  await page.route('http://127.0.0.1:4173/**',route=>{
    const file=resolve('dist','.'+new URL(route.request().url()).pathname);
    if(!file.startsWith(resolve('dist')+sep)||!existsSync(file))return route.fulfill({status:404});
    return route.fulfill({body:readFileSync(file),contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]||'application/octet-stream'});
  });
  await page.goto('http://127.0.0.1:4173/src/tour/index.html');
}

test('tour supports back, forward, completion, keyboard and narrow viewports',async({page})=>{
  await tour(page);
  await expect(page.locator('#progress')).toHaveText('1 / 5');
  await expect(page.getByRole('button',{name:'Back',exact:true})).toBeDisabled();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#progress')).toHaveText('2 / 5');
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#progress')).toHaveText('1 / 5');
  for(const width of [320,390,768]) {
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(page.locator('#next')).toBeVisible();
  }
  await page.setViewportSize({width:1100,height:900});
  await page.screenshot({path:'build/browser-results/feature-tour-desktop.png'});
  for(let i=0;i<4;i++)await page.locator('#next').click();
  await expect(page.locator('#next')).toHaveText('Open ChatGPT');
  await page.locator('#next').click(); await expect(page).toHaveURL('https://chatgpt.com/');
  await page.goBack();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tourSaved'))['cgpt-ra-tour-v1'])).toBe('completed');
});

test('tour respects manual language, RTL arrows, dark theme and skip',async({page})=>{
  await page.setViewportSize({width:360,height:900}); await tour(page,'ar','dark');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('.tour')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('#skip')).toHaveText('تخطي الجولة');
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#progress')).toContainText('2');
  await page.screenshot({path:'build/browser-results/feature-tour-rtl.png'});
  await page.keyboard.press('Escape'); await expect(page).toHaveURL('https://chatgpt.com/');
  await page.goBack();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('tourSaved'))['cgpt-ra-tour-v1'])).toBe('skipped');
});

test('failed persistence leaves a retryable tour instead of claiming completion',async({page})=>{
  await tour(page,'en','light',true); await page.locator('#skip').click();
  await expect(page.locator('#error')).not.toBeEmpty();
  await expect(page.locator('#skip')).toBeEnabled();
  expect(page.url()).toContain('/src/tour/');
});

test('only a fresh install opens a tour; updates and browser startup do not',async()=>{
  let installed,startup; const opened=[]; const event={addListener:()=>{}};
  const chrome={runtime:{onInstalled:{addListener:fn=>installed=fn},onStartup:{addListener:fn=>startup=fn},onMessage:event,id:'test',getURL:path=>'chrome-extension://test/'+path,getPlatformInfo:async()=>({os:'win'}),setUninstallURL:async()=>{}},
    tabs:{onRemoved:event,create:async value=>opened.push(value)},commands:{onCommand:event},
    storage:{local:{get:async()=>({})},sync:{get:async()=>({})},onChanged:event}};
  runInNewContext(readFileSync('dist/background/worker.js','utf8'),{chrome,console,URL,URLSearchParams,navigator:{language:'en'}});
  installed({reason:'update'}); installed({reason:'chrome_update'}); startup();
  expect(opened).toHaveLength(0);
  installed({reason:'install'});
  expect(opened).toEqual([{url:'chrome-extension://test/src/tour/index.html'}]);
});
