import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const base='https://infoxica.github.io/chatgpt-audio-controls/';
test('static routes and consent keep analytics opt-in and store clicks distinct',async({page,context})=>{
  const tracking=[];
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith(base)){
      const relative=url.slice(base.length) || 'index.html';
      const file=relative.endsWith('/')?relative+'index.html':relative;
      const content=await fs.readFile('site-dist/'+file);
      const body=file.endsWith('.html')?content.toString().replace(/data-ga4="[^"]*"/,'data-ga4="G-TEST123"'):content;
      return route.fulfill({body,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html; charset=utf-8'});
    }
    tracking.push(url);return route.fulfill({body:'',contentType:'application/javascript'});
  });
  await page.goto(base);await expect(page.getByRole('button',{name:'No thanks',exact:true})).toBeVisible();
  expect(tracking).toEqual([]);await page.getByRole('button',{name:'No thanks',exact:true}).click();await page.reload();expect(tracking).toEqual([]);
  await page.getByRole('button',{name:'Analytics preferences'}).click();await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
  await expect.poll(()=>tracking.filter(url=>url.includes('googletagmanager')).length).toBe(1);
  await page.locator('a[data-store=chrome][data-placement=hero]').click({modifiers:['Control']});
  const event=await page.evaluate(()=>window.dataLayer.map(args=>Array.from(args)).find(args=>args[0]==='event'));
  expect(event).toEqual(['event','store_link_click',{store:'chrome',locale:'en',placement:'hero',transport_type:'beacon'}]);
  await page.getByRole('button',{name:'Analytics preferences'}).click();await page.getByRole('button',{name:'No thanks',exact:true}).click();
  expect(await page.evaluate(()=>window['ga-disable-G-TEST123'])).toBe(true);
  await page.screenshot({path:'build/browser-results/website.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto(base+'ja/');
  await expect(page.locator('html')).toHaveAttribute('lang','ja');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'build/browser-results/website-mobile-ja.png',fullPage:true});
});
test('survey selects then submits, skips without writes and preserves input after failure',async({page})=>{
  const translations=vm.runInNewContext((await fs.readFile('build/feedback/Translations.gs','utf8'))+';({copy:SURVEY_COPY,names:LANGUAGE_NAMES})');
  const state={locale:'en',locales:translations.copy,names:translations.names,id:'test-page',expires:Date.now()+3600000,token:'test',version:'1.2.0',browser:'Edge',os:'Windows'};
  const template=(await fs.readFile('feedback/Index.html','utf8')).replace('<?!= bootstrap ?>',JSON.stringify(state));
  await page.route('https://survey.test/**',route=>route.fulfill({body:template,contentType:'text/html; charset=utf-8'}));
  await page.addInitScript(()=>{
    window.saved=[];window.failNext=true;
    const runner={withSuccessHandler(fn){this.success=fn;return this;},withFailureHandler(fn){this.failure=fn;return this;},submitFeedback(value){if(window.failNext){window.failNext=false;setTimeout(()=>this.failure(new Error('test failure')),20);}else{window.saved.push(value);setTimeout(()=>this.success({saved:true}),20);}}};
    window.google={script:{run:runner}};
  });
  await page.goto('https://survey.test/');
  expect(await page.locator('input[type=radio]:checked').count()).toBe(0);
  await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#error')).toHaveText('Choose one reason to send feedback.');
  await page.getByLabel('Something else.',{exact:true}).check();await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#error')).toContainText('wasn’t confirmed');
  await expect(page.getByLabel('Something else.',{exact:true})).toBeChecked();await expect(page.locator('#note')).toHaveValue('');
  await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#confirmation')).toHaveText('Thank you for helping us improve. You’re always welcome back.');
  const rows=await page.evaluate(()=>window.saved);expect(rows).toHaveLength(1);expect(rows[0].comment).toBe('');expect(rows[0].reason).toBe('other');
  await page.reload();await page.locator('#language').selectOption('ja');await expect(page.locator('html')).toHaveAttribute('lang','ja');await page.getByRole('button',{name:translations.copy.ja.skip,exact:true}).click();expect(await page.evaluate(()=>window.saved.length)).toBe(0);
  await page.reload();await page.locator('#language').selectOption('vi');await page.screenshot({path:'build/browser-results/survey-vi.png',fullPage:true});
});
