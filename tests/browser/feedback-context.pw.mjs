import {test,expect} from '@playwright/test';
import {Miniflare} from 'miniflare';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
let mf,db,origin;
test.beforeAll(async()=>{
  execFileSync('bun',['scripts/build-feedback-copy.ts']);
  await fs.mkdir('build',{recursive:true});
  execFileSync('bun',['build','feedback/worker/src/index.ts','--target=browser','--outfile=build/test-feedback-context.mjs']);
  mf=new Miniflare({modules:true,scriptPath:'build/test-feedback-context.mjs',compatibilityDate:'2026-07-30',d1Databases:['DB'],bindings:{ENVIRONMENT:'local',TURNSTILE_SITE_KEY:'test',TURNSTILE_SECRET_KEY:'test'},outboundService:async()=>Response.json({success:true})});
  origin=(await mf.ready).origin;db=await mf.getD1Database('DB');
  for(const file of ['0001_feedback.sql','0002_optional_feedback_context.sql'])await db.exec((await fs.readFile('feedback/worker/migrations/'+file,'utf8')).replace(/\n/g,' '));
});
test.afterAll(async()=>{await mf?.dispose();});
async function open(page,query=''){
  await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:"window.turnstile={remove:()=>{},render:(selector,options)=>{window.testChallenge=options;options.callback('valid');return 1;},reset:()=>window.testChallenge.callback('valid')};window.feedbackChallengeReady();"}));
  await page.goto(origin+'/feedback?source=installed&lang=en&version=1.0.0'+query);
}
const count=async()=> (await db.prepare('SELECT count(*) n FROM feedback').first()).n;
test('basic mouse and keyboard paths need no new mandatory answer',async({page})=>{
  await open(page);const before=await count();
  await expect(page.locator('#feature-context')).toBeHidden();
  await page.locator('input[value=bug]').check();
  await expect(page.locator('#feature-context')).toBeVisible();
  await expect(page.locator('#symptom-context')).toBeHidden();
  await page.locator('#send').click();await expect(page.locator('#done')).toBeVisible();
  const first=await db.prepare('SELECT form_version,feature FROM feedback ORDER BY received_at DESC LIMIT 1').first();expect(first.form_version).toBe(1);expect(first.feature).toBeNull();
  await open(page);await page.locator('input[value=bug]').focus();await page.keyboard.press('Space');await page.keyboard.press('Enter');await expect(page.locator('#done')).toBeVisible();
  expect(await count()).toBe(before+2);
});
test('chips toggle independently, clear on category change, and never auto-submit',async({page})=>{
  await open(page);const before=await count();await page.locator('input[value=bug]').check();
  await page.locator('#features button[value=seek]').click();await expect(page.locator('#symptom-context')).toBeVisible();
  await page.locator('#symptoms button[value=incorrect]').click();expect(await count()).toBe(before);
  await page.locator('input[value=suggestion]').check();await expect(page.locator('#feature-context')).toBeHidden();
  await page.locator('input[value=bug]').check();await expect(page.locator('#features [aria-pressed=true]')).toHaveCount(0);
  await page.locator('#features button[value=seek]').click();await page.locator('#symptoms button[value=intermittent]').click();
  await page.locator('#send').click();await expect(page.locator('#done')).toBeVisible();
  const saved=await db.prepare('SELECT feature,symptom,form_version FROM feedback ORDER BY received_at DESC LIMIT 1').first();expect(saved).toEqual({feature:'seek',symptom:'intermittent',form_version:2});
});
test('changed optional answer after lost response rotates submission ID',async({page})=>{
  await open(page);const bodies=[];
  await page.route('**/api/feedback',async route=>{bodies.push(route.request().postDataJSON());if(bodies.length===1){await route.fetch();await route.abort('failed');}else await route.continue();});
  await page.locator('input[value=bug]').check();await page.locator('#features button[value=seek]').click();await page.locator('#send').click();await expect(page.locator('#error')).not.toBeEmpty();
  await page.locator('#features button[value=speed]').click();await page.locator('#send').click();await expect(page.locator('#done')).toBeVisible();
  expect(bodies[0].id).not.toBe(bodies[1].id);
});
test('localized RTL and long chips fit light/dark mobile screens; skip creates no record',async({page})=>{
  await open(page,'&intent=bug');const before=await count();await page.locator('#features button[value=controls]').click();
  const locales=Object.keys(JSON.parse(await fs.readFile('feedback/worker/src/context.generated.json','utf8')));
  await page.setViewportSize({width:390,height:844});
  for(const locale of locales){await page.locator('#language').selectOption(locale);await expect(page.locator('#feature-prompt')).not.toBeEmpty();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),locale).toBe(true);}
  await fs.mkdir('build/browser-results',{recursive:true});
  for(const locale of ['en','ar','ja'])for(const theme of ['light','dark']){await page.locator('#language').selectOption(locale);await page.locator('#theme').selectOption(theme);await page.screenshot({path:`build/browser-results/feedback-context-${locale}-${theme}.png`,fullPage:true});}
  await page.locator('#skip').click();await expect(page.locator('#done')).toBeVisible();expect(await count()).toBe(before);
});
